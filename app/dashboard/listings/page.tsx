import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import ListingForm from "@/components/ListingForm";
import SyncButtons from "@/components/SyncButtons";

export default async function ListingsPage() {
  const host = (await getCurrentHost())!;
  const [listings, pmsConnections] = await Promise.all([
    prisma.listing.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reservations: true, upsells: true } } },
    }),
    prisma.pmsConnection.findMany({ where: { hostId: host.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Listings</h1>
        <SyncButtons hasPms={pmsConnections.length > 0} />
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Add a listing manually</h2>
        <p className="mb-4 text-sm text-slate-500">
          Not on a PMS? Add your property and paste its Airbnb iCal export link — reservations
          sync automatically every hour.
        </p>
        <ListingForm />
      </section>

      <section className="space-y-3">
        {listings.length === 0 ? (
          <div className="card text-sm text-slate-500">
            No listings yet. Add one above, or connect Hospitable/Hostaway in Settings to import
            everything automatically.
          </div>
        ) : (
          listings.map((listing) => (
            <div key={listing.id} className="card flex flex-wrap items-center gap-4">
              {listing.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.photoUrl}
                  alt=""
                  className="h-16 w-24 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  No photo
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{listing.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {listing.address ?? "No address"} ·{" "}
                  {listing.pmsProvider
                    ? `Synced via ${listing.pmsProvider}`
                    : listing.icalUrl
                      ? "iCal sync"
                      : "Manual"}
                </p>
                <p className="text-xs text-slate-400">
                  {listing._count.reservations} reservations · {listing._count.upsells} listing
                  upsells
                </p>
              </div>
              {!listing.active && <span className="badge bg-slate-100 text-slate-500">Inactive</span>}
              {listing.icalUrl && <SyncButtons listingId={listing.id} />}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
