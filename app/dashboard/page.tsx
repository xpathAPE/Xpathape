import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import OrderBadge from "@/components/OrderBadge";

export default async function DashboardOverview() {
  const host = (await getCurrentHost())!;
  const now = new Date();

  const [listingCount, upcomingCount, upsellCount, paidAgg, recentOrders] = await Promise.all([
    prisma.listing.count({ where: { hostId: host.id } }),
    prisma.reservation.count({
      where: { listing: { hostId: host.id }, checkOut: { gte: now } },
    }),
    prisma.upsell.count({ where: { hostId: host.id, active: true } }),
    prisma.order.aggregate({
      where: { hostId: host.id, status: "PAID" },
      _sum: { subtotalCents: true, applicationFeeCents: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: true,
        reservation: { include: { listing: { select: { name: true } } } },
      },
    }),
  ]);

  const gross = paidAgg._sum.subtotalCents ?? 0;
  const fees = paidAgg._sum.applicationFeeCents ?? 0;

  return (
    <div className="space-y-8">
      {!host.stripeOnboarded && (
        <div className="card border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-900">
            <strong>Finish setup:</strong> connect Stripe to start accepting upsell payments.{" "}
            <Link href="/dashboard/settings" className="font-medium underline">
              Go to Settings →
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Listings" value={String(listingCount)} href="/dashboard/listings" />
        <Stat label="Upcoming stays" value={String(upcomingCount)} href="/dashboard/reservations" />
        <Stat label="Active upsells" value={String(upsellCount)} href="/dashboard/upsells" />
        <Stat
          label="Upsell revenue (net)"
          value={formatMoney(gross - fees)}
          sub={`${paidAgg._count} paid orders`}
          href="/dashboard/orders"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="card text-sm text-slate-500">
            No orders yet. Add listings, create upsells, and share guest storefront links to get
            your first purchase.
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 p-0">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {order.items.map((i) => i.title).join(", ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.reservation.listing.name} · {order.reservation.guestName ?? "Guest"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatMoney(order.subtotalCents, order.currency)}
                  </p>
                  <OrderBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="card hover:border-brand-500">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </Link>
  );
}
