import type { PmsAdapter, PmsListing, PmsReservation } from "./types";

const BASE = "https://public.api.hospitable.com/v2";

/**
 * Hospitable Public API v2 adapter.
 * Auth: Personal Access Token (Bearer).
 * Docs: https://developer.hospitable.com
 */
export function createHospitableAdapter(apiKey: string): PmsAdapter {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function get(path: string): Promise<any> {
    const res = await fetch(`${BASE}${path}`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Hospitable API ${path}: HTTP ${res.status}`);
    return res.json();
  }

  return {
    provider: "HOSPITABLE",

    async fetchListings(): Promise<PmsListing[]> {
      const out: PmsListing[] = [];
      let page = 1;
      for (;;) {
        const data = await get(`/properties?page=${page}&per_page=100`);
        const items: any[] = data?.data ?? [];
        for (const p of items) {
          out.push({
            externalId: String(p.id),
            name: p.public_name ?? p.name ?? `Property ${p.id}`,
            address: p.address
              ? [p.address.street, p.address.city, p.address.state].filter(Boolean).join(", ")
              : undefined,
            photoUrl: p.picture ?? p.photos?.[0]?.url ?? undefined,
            timezone: p.timezone ?? undefined,
          });
        }
        if (!data?.links?.next || items.length === 0) break;
        page += 1;
      }
      return out;
    },

    async fetchReservations(): Promise<PmsReservation[]> {
      const out: PmsReservation[] = [];
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 1);
      let page = 1;
      for (;;) {
        const data = await get(
          `/reservations?start_date=${since.toISOString().slice(0, 10)}&include=guest&page=${page}&per_page=100`
        );
        const items: any[] = data?.data ?? [];
        for (const r of items) {
          const checkIn = new Date(r.arrival_date ?? r.check_in);
          const checkOut = new Date(r.departure_date ?? r.check_out);
          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) continue;
          out.push({
            externalId: String(r.id ?? r.code),
            listingExternalId: String(r.properties?.[0]?.id ?? r.property_id ?? ""),
            guestName: r.guest
              ? [r.guest.first_name, r.guest.last_name].filter(Boolean).join(" ")
              : undefined,
            guestEmail: r.guest?.email ?? undefined,
            guestPhone: r.guest?.phone_numbers?.[0] ?? r.guest?.phone ?? undefined,
            checkIn,
            checkOut,
            guestCount: r.guests?.total ?? r.number_of_guests ?? 1,
            status:
              r.reservation_status?.current?.category === "accepted" || r.status === "accepted"
                ? "accepted"
                : r.status === "cancelled"
                  ? "cancelled"
                  : "other",
          });
        }
        if (!data?.links?.next || items.length === 0) break;
        page += 1;
      }
      return out;
    },

    async sendMessage(reservationExternalId, body) {
      const res = await fetch(`${BASE}/reservations/${reservationExternalId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        return { ok: false, detail: `Hospitable message HTTP ${res.status}` };
      }
      return { ok: true };
    },
  };
}
