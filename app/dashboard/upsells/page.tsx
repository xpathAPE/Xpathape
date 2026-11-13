import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import UpsellForm from "@/components/UpsellForm";
import UpsellRowActions from "@/components/UpsellRowActions";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM_UPGRADE: "Room Upgrade",
  EARLY_CHECKIN: "Early Check-in",
  LATE_CHECKOUT: "Late Checkout",
  AMENITY: "Amenity",
  EXPERIENCE: "Experience",
  OTHER: "Other",
};

const PRICING_LABELS: Record<string, string> = {
  FLAT: "per stay",
  PER_NIGHT: "per night",
  PER_GUEST: "per guest",
};

export default async function UpsellsPage() {
  const host = (await getCurrentHost())!;
  const [upsells, listings] = await Promise.all([
    prisma.upsell.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { name: true } } },
    }),
    prisma.listing.findMany({
      where: { hostId: host.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Upsells</h1>

      <section className="card">
        <h2 className="mb-4 font-semibold">Create an upsell</h2>
        <UpsellForm listings={listings} />
      </section>

      <section className="space-y-3">
        {upsells.length === 0 ? (
          <div className="card text-sm text-slate-500">
            No upsells yet. Popular starters: early check-in ($50 flat), late checkout ($50
            flat), pool heating ($30/night), airport pickup ($15/guest).
          </div>
        ) : (
          upsells.map((u) => (
            <div key={u.id} className="card flex flex-wrap items-center gap-4">
              {u.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.photoUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  🎁
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{u.title}</p>
                  <span className="badge bg-brand-100 text-brand-700">
                    {CATEGORY_LABELS[u.category]}
                  </span>
                  {!u.active && <span className="badge bg-slate-100 text-slate-500">Inactive</span>}
                </div>
                <p className="text-sm text-slate-500">
                  {formatMoney(u.priceCents, u.currency)} {PRICING_LABELS[u.pricingType]} ·{" "}
                  {u.listing ? u.listing.name : "All listings"}
                  {u.maxPerDay != null && ` · max ${u.maxPerDay}/day`}
                  {u.leadTimeCutoffHours != null && ` · cutoff ${u.leadTimeCutoffHours}h before check-in`}
                </p>
              </div>
              <UpsellRowActions id={u.id} active={u.active} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
