import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import OrderBadge from "@/components/OrderBadge";
import RefundButton from "@/components/RefundButton";

export default async function OrdersPage() {
  const host = (await getCurrentHost())!;
  const orders = await prisma.order.findMany({
    where: { hostId: host.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      items: true,
      reservation: { include: { listing: { select: { name: true } } } },
    },
  });

  const paidTotal = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.subtotalCents - o.applicationFeeCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-slate-500">
          Net payout to you (paid orders): <strong>{formatMoney(paidTotal)}</strong>
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="card text-sm text-slate-500">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{order.reservation.listing.name}</p>
                    <OrderBadge status={order.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {order.reservation.guestName ?? "Guest"} ·{" "}
                    {order.reservation.checkIn.toISOString().slice(0, 10)} →{" "}
                    {order.reservation.checkOut.toISOString().slice(0, 10)} ·{" "}
                    {order.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.quantity} —{" "}
                        {formatMoney(item.totalCents, order.currency)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {formatMoney(order.subtotalCents, order.currency)}
                  </p>
                  <p className="text-xs text-slate-400">
                    platform fee {formatMoney(order.applicationFeeCents, order.currency)}
                  </p>
                  {order.status === "PAID" && <RefundButton orderId={order.id} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
