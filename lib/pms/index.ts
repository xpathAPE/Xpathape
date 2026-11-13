import { prisma } from "@/lib/db";
import { generateStorefrontToken } from "@/lib/tokens";
import { fetchIcs, guestNameFromSummary, isReservationEvent } from "@/lib/ical";
import { createHospitableAdapter } from "./hospitable";
import { createHostawayAdapter } from "./hostaway";
import type { PmsAdapter } from "./types";
import type { PmsConnection, Reservation } from "@prisma/client";

export function adapterFor(conn: PmsConnection): PmsAdapter {
  if (conn.provider === "HOSPITABLE") return createHospitableAdapter(conn.apiKey);
  return createHostawayAdapter(conn.accountId ?? "", conn.apiKey);
}

export interface SyncResult {
  listingsImported: number;
  reservationsUpserted: number;
  errors: string[];
}

/** Import/refresh listings and reservations from every PMS connection a host has. */
export async function syncHostPms(hostId: string): Promise<SyncResult> {
  const result: SyncResult = { listingsImported: 0, reservationsUpserted: 0, errors: [] };
  const connections = await prisma.pmsConnection.findMany({ where: { hostId } });

  for (const conn of connections) {
    try {
      const adapter = adapterFor(conn);

      // 1. Listings
      const pmsListings = await adapter.fetchListings();
      const listingIdMap = new Map<string, string>(); // externalId -> local id
      for (const pl of pmsListings) {
        const existing = await prisma.listing.findFirst({
          where: { hostId, pmsProvider: conn.provider, pmsListingId: pl.externalId },
        });
        const listing = existing
          ? await prisma.listing.update({
              where: { id: existing.id },
              data: {
                name: pl.name,
                address: pl.address,
                photoUrl: pl.photoUrl ?? existing.photoUrl,
                timezone: pl.timezone ?? existing.timezone,
              },
            })
          : await prisma.listing.create({
              data: {
                hostId,
                name: pl.name,
                address: pl.address,
                photoUrl: pl.photoUrl,
                timezone: pl.timezone ?? "UTC",
                pmsProvider: conn.provider,
                pmsListingId: pl.externalId,
              },
            });
        if (!existing) result.listingsImported += 1;
        listingIdMap.set(pl.externalId, listing.id);
      }

      // 2. Reservations
      const pmsReservations = await adapter.fetchReservations();
      for (const pr of pmsReservations) {
        if (pr.status !== "accepted") continue;
        const listingId = listingIdMap.get(pr.listingExternalId);
        if (!listingId) continue;
        await upsertReservation({
          listingId,
          source: conn.provider,
          externalId: pr.externalId,
          guestName: pr.guestName,
          guestEmail: pr.guestEmail,
          guestPhone: pr.guestPhone,
          checkIn: pr.checkIn,
          checkOut: pr.checkOut,
          guestCount: pr.guestCount,
        });
        result.reservationsUpserted += 1;
      }

      await prisma.pmsConnection.update({
        where: { id: conn.id },
        data: { lastSync: new Date() },
      });
    } catch (err) {
      result.errors.push(
        `${conn.provider}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return result;
}

/** Sync reservations for one listing from its Airbnb iCal feed. */
export async function syncListingIcal(listingId: string): Promise<SyncResult> {
  const result: SyncResult = { listingsImported: 0, reservationsUpserted: 0, errors: [] };
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing?.icalUrl) {
    result.errors.push("Listing has no iCal URL configured");
    return result;
  }
  try {
    const events = await fetchIcs(listing.icalUrl);
    for (const event of events) {
      if (!isReservationEvent(event)) continue;
      // Skip stays already fully in the past
      if (event.end.getTime() < Date.now() - 24 * 60 * 60 * 1000) continue;
      await upsertReservation({
        listingId: listing.id,
        source: "ICAL",
        externalId: event.uid,
        guestName: guestNameFromSummary(event.summary) ?? undefined,
        checkIn: event.start,
        checkOut: event.end,
        guestCount: 1,
      });
      result.reservationsUpserted += 1;
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }
  return result;
}

async function upsertReservation(data: {
  listingId: string;
  source: "ICAL" | "HOSPITABLE" | "HOSTAWAY" | "MANUAL";
  externalId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
}): Promise<Reservation> {
  return prisma.reservation.upsert({
    where: {
      listingId_externalId: { listingId: data.listingId, externalId: data.externalId },
    },
    update: {
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guestCount: data.guestCount,
      // Never blank out contact info we already have
      ...(data.guestName ? { guestName: data.guestName } : {}),
      ...(data.guestEmail ? { guestEmail: data.guestEmail } : {}),
      ...(data.guestPhone ? { guestPhone: data.guestPhone } : {}),
    },
    create: {
      listingId: data.listingId,
      source: data.source,
      externalId: data.externalId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guestCount: data.guestCount,
      storefrontToken: generateStorefrontToken(),
    },
  });
}

/** Relay a message to the guest through the host's PMS connection. */
export async function sendPmsMessage(
  hostId: string,
  reservation: { source: string; externalId: string | null },
  body: string
): Promise<{ ok: boolean; detail?: string }> {
  if (
    (reservation.source !== "HOSPITABLE" && reservation.source !== "HOSTAWAY") ||
    !reservation.externalId
  ) {
    return { ok: false, detail: "Reservation is not linked to a PMS thread" };
  }
  const conn = await prisma.pmsConnection.findFirst({
    where: { hostId, provider: reservation.source },
  });
  if (!conn) return { ok: false, detail: `No ${reservation.source} connection` };
  try {
    return await adapterFor(conn).sendMessage(reservation.externalId, body);
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
