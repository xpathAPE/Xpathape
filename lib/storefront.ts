import { prisma } from "@/lib/db";
import { nightsBetween, withinLeadTime, computeItemTotalCents } from "@/lib/pricing";

/**
 * Load everything the guest storefront needs for a reservation token:
 * the stay, the listing, and the upsells currently purchasable
 * (active, listing-specific or global, within lead time, inventory left).
 */
export async function getStorefrontData(token: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { storefrontToken: token },
    include: { listing: { include: { host: true } } },
  });
  if (!reservation || !reservation.listing.active) return null;

  const host = reservation.listing.host;
  const now = new Date();
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);

  const upsells = await prisma.upsell.findMany({
    where: {
      hostId: host.id,
      active: true,
      OR: [{ listingId: reservation.listingId }, { listingId: null }],
    },
    orderBy: [{ category: "asc" }, { priceCents: "asc" }],
  });

  // Units of each upsell already sold (pending or paid) for this stay's dates —
  // approximation of the daily inventory cap applied per stay window.
  const soldCounts = await prisma.orderItem.groupBy({
    by: ["upsellId"],
    where: {
      upsellId: { in: upsells.map((u) => u.id) },
      order: {
        status: { in: ["PENDING", "PAID"] },
        reservation: {
          listingId: reservation.listingId,
          checkIn: { lt: reservation.checkOut },
          checkOut: { gt: reservation.checkIn },
        },
      },
    },
    _sum: { quantity: true },
  });
  const soldMap = new Map(soldCounts.map((s) => [s.upsellId, s._sum.quantity ?? 0]));

  const available = upsells
    .filter((u) => withinLeadTime(u.leadTimeCutoffHours, reservation.checkIn, now))
    .filter((u) => u.maxPerDay == null || (soldMap.get(u.id) ?? 0) < u.maxPerDay)
    .map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      photoUrl: u.photoUrl,
      category: u.category,
      pricingType: u.pricingType,
      priceCents: u.priceCents,
      currency: u.currency,
      computedTotalCents: computeItemTotalCents(u.pricingType, u.priceCents, {
        nights,
        guests: reservation.guestCount,
      }),
    }));

  return {
    reservation: {
      id: reservation.id,
      guestName: reservation.guestName,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guestCount: reservation.guestCount,
      nights,
    },
    listing: {
      name: reservation.listing.name,
      address: reservation.listing.address,
      photoUrl: reservation.listing.photoUrl,
    },
    host: {
      name: host.name,
      stripeReady: Boolean(host.stripeAccountId && host.stripeOnboarded),
    },
    upsells: available,
  };
}
