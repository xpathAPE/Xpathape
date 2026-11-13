import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, appUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/messaging/email";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook: payment + Connect account lifecycle.
 * Configure endpoint for events:
 *   payment_intent.succeeded, payment_intent.payment_failed,
 *   charge.refunded, account.updated
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await markOrderPaid(pi);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: pi.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === "string" && charge.refunded) {
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent },
          data: { status: "REFUNDED" },
        });
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await prisma.host.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          stripeOnboarded: Boolean(account.charges_enabled && account.payouts_enabled),
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function markOrderPaid(pi: Stripe.PaymentIntent) {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: pi.id },
    include: {
      items: true,
      host: true,
      reservation: { include: { listing: true } },
    },
  });
  if (!order || order.status === "PAID") return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      guestEmail: pi.receipt_email ?? order.guestEmail,
    },
  });

  // Fulfillment alert to host (and optional staff email) so the purchase is
  // fulfilled before arrival.
  const lines = order.items
    .map((i) => `• ${i.title} x${i.quantity} — ${formatMoney(i.totalCents, order.currency)}`)
    .join("\n");
  const body =
    `New upsell purchase for ${order.reservation.listing.name}\n` +
    `Guest: ${order.reservation.guestName ?? "Guest"} ` +
    `(${order.reservation.checkIn.toISOString().slice(0, 10)} → ${order.reservation.checkOut.toISOString().slice(0, 10)})\n\n` +
    `${lines}\n\nTotal: ${formatMoney(order.subtotalCents, order.currency)}\n\n` +
    `Manage: ${appUrl("/dashboard/orders")}`;

  const recipients = [order.host.email];
  if (order.host.staffAlertEmail) recipients.push(order.host.staffAlertEmail);
  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: `💰 New upsell order — ${order.reservation.listing.name}`,
        text: body,
      })
    )
  );
}
