import type { PmsAdapter, PmsListing, PmsReservation } from "./types";

const BASE = "https://api.hostaway.com/v1";

/**
 * Hostaway API v1 adapter.
 * Auth: OAuth2 client credentials (accountId = client_id, apiKey = client_secret).
 * Docs: https://api.hostaway.com/documentation
 */
export function createHostawayAdapter(accountId: string, apiKey: string): PmsAdapter {
  let accessToken: string | null = null;
  let tokenExpiry = 0;

  async function token(): Promise<string> {
    if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;
    const res = await fetch(`${BASE}/accessTokens`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: accountId,
        client_secret: apiKey,
        scope: "general",
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Hostaway auth failed: HTTP ${res.status}`);
    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    return accessToken!;
  }

  async function get(path: string): Promise<any> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${await token()}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Hostaway API ${path}: HTTP ${res.status}`);
    return res.json();
  }

  return {
    provider: "HOSTAWAY",

    async fetchListings(): Promise<PmsListing[]> {
      const data = await get(`/listings?limit=500`);
      const items: any[] = data?.result ?? [];
      return items.map((l) => ({
        externalId: String(l.id),
        name: l.name ?? l.internalListingName ?? `Listing ${l.id}`,
        address: [l.address, l.city].filter(Boolean).join(", ") || undefined,
        photoUrl: l.thumbnailUrl ?? l.listingImages?.[0]?.url ?? undefined,
        timezone: l.timeZoneName ?? undefined,
      }));
    },

    async fetchReservations(): Promise<PmsReservation[]> {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 1);
      const data = await get(
        `/reservations?limit=500&departureStartDate=${since.toISOString().slice(0, 10)}`
      );
      const items: any[] = data?.result ?? [];
      return items
        .map((r): PmsReservation | null => {
          const checkIn = new Date(`${r.arrivalDate}T00:00:00.000Z`);
          const checkOut = new Date(`${r.departureDate}T00:00:00.000Z`);
          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return null;
          return {
            externalId: String(r.id),
            listingExternalId: String(r.listingMapId),
            guestName: r.guestName ?? undefined,
            guestEmail: r.guestEmail ?? undefined,
            guestPhone: r.phone ?? undefined,
            checkIn,
            checkOut,
            guestCount: r.numberOfGuests ?? r.adults ?? 1,
            status:
              r.status === "new" || r.status === "modified" || r.status === "accepted"
                ? "accepted"
                : r.status === "cancelled"
                  ? "cancelled"
                  : "other",
          };
        })
        .filter((r): r is PmsReservation => r !== null);
    },

    async sendMessage(reservationExternalId, body) {
      const res = await fetch(
        `${BASE}/reservations/${reservationExternalId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await token()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body, communicationType: "channel" }),
        }
      );
      if (!res.ok) {
        return { ok: false, detail: `Hostaway message HTTP ${res.status}` };
      }
      return { ok: true };
    },
  };
}
