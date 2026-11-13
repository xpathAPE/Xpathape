import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

/**
 * 1-click full refund: reverses the charge, pulls funds back from the
 * host's connected account, and refunds our application fee.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const host = await requireHost();
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, hostId: host.id },
    });
    if (!order) return jsonError("Order not found", 404);
    if (order.status !== "PAID") return jsonError("Only paid orders can be refunded", 409);
    if (!order.stripePaymentIntentId) return jsonError("Order has no payment", 409);

    await getStripe().refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
    return NextResponse.json(updated);
  });
}
