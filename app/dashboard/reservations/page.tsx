import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import CopyLinkButton from "@/components/CopyLinkButton";

export default async function ReservationsPage() {
  const host = (await getCurrentHost())!;
  const reservations = await prisma.reservation.findMany({
    where: { listing: { hostId: host.id } },
    orderBy: { checkIn: "asc" },
    take: 200,
    include: {
      listing: { select: { name: true } },
      _count: { select: { orders: true } },
    },
  });

  const now = new Date();
  const upcoming = reservations.filter((r) => r.checkOut >= now);
  const past = reservations.filter((r) => r.checkOut < now).reverse();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reservations</h1>
      <p className="text-sm text-slate-500">
        Every reservation gets a unique guest storefront link. Automated triggers send it for
        you (Settings → Messaging), or copy it and send it manually.
      </p>

      <ReservationTable title={`Upcoming (${upcoming.length})`} reservations={upcoming} />
      {past.length > 0 && (
        <ReservationTable title={`Past (${past.length})`} reservations={past} />
      )}
    </div>
  );
}

function ReservationTable({
  title,
  reservations,
}: {
  title: string;
  reservations: Array<{
    id: string;
    guestName: string | null;
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
    source: string;
    storefrontToken: string;
    listing: { name: string };
    _count: { orders: number };
  }>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {reservations.length === 0 ? (
        <div className="card text-sm text-slate-500">
          No reservations yet — sync a listing's iCal or connect your PMS.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Storefront</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.guestName ?? "Guest"}</td>
                  <td className="px-4 py-3">{r.listing.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.checkIn.toISOString().slice(0, 10)} → {r.checkOut.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{r.guestCount}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-100 text-slate-600">{r.source}</span>
                  </td>
                  <td className="px-4 py-3">{r._count.orders}</td>
                  <td className="px-4 py-3">
                    <CopyLinkButton path={`/s/${r.storefrontToken}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
