import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, jsonError } from "@/lib/api";
import { getStripe } from "@/lib/stripe";
import {
  computeApplicationFeeCents,
  computeItemTotalCents,
  nightsBetween,
  withinLeadTime,
} from "@/lib/pricing";

const schema = z.object({
  items: z
    .array(
      z.object({
        upsellId: z.string(),
        quantity: z.number().int().min(1).max(50).default(1),
      })
    )
    .min(1, "Select at least one upgrade"),
  guestEmail: z.string().email().optional(),
});

type Params = { params: Promise<{ token: string }> };

/**
 * Create an Order + Stripe PaymentIntent for the guest's selection.
 * Server-side recomputation of all prices; the client never sends amounts.
 * Funds route to the host's connected account minus our application fee
 * (destination charge on the platform account).
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { token } = await params;
    const body = schema.parse(await req.json());

    const reservation = await prisma.reservation.findUnique({
      where: { storefrontToken: token },
      include: { listing: { include: { host: true } } },
    });
    if (!reservation) return jsonError("Reservation not found", 404);

    const host = reservation.listing.host;
    if (!host.stripeAccountId || !host.stripeOnboarded) {
      return jsonError("This host is not yet accepting payments", 409);
    }

    const upsells = await prisma.upsell.findMany({
      where: {
        id: { in: body.items.map((i) => i.upsellId) },
        hostId: host.id,
        active: true,
        OR: [{ listingId: reservation.listingId }, { listingId: null }],
      },
    });
    if (upsells.length !== body.items.length) {
      return jsonError("One or more upgrades are no longer available", 409);
    }

    const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
    const now = new Date();
    const currency = upsells[0].currency;
    if (upsells.some((u) => u.currency !== currency)) {
      return jsonError("Mixed currencies in one order are not supported", 409);
    }

    // Validate lead time + inventory, compute totals server-side.
    let subtotalCents = 0;
    const itemsData: Array<{
      upsellId: string;
      title: string;
      pricingType: "FLAT" | "PER_NIGHT" | "PER_GUEST";
      unitPriceCents: number;
      quantity: number;
      totalCents: number;
    }> = [];

    for (const sel of body.items) {
      const upsell = upsells.find((u) => u.id === sel.upsellId)!;
      if (!withinLeadTime(upsell.leadTimeCutoffHours, reservation.checkIn, now)) {
        return jsonError(`"${upsell.title}" can no longer be purchased for this stay`, 409);
      }
      if (upsell.maxPerDay != null) {
        const sold = await prisma.orderItem.aggregate({
          where: {
            upsellId: upsell.id,
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
        if ((sold._sum.quantity ?? 0) + sel.quantity > upsell.maxPerDay) {
          return jsonError(`"${upsell.title}" is sold out for these dates`, 409);
        }
      }
      const totalCents = computeItemTotalCents(upsell.pricingType, upsell.priceCents, {
        nights,
        guests: reservation.guestCount,
        quantity: sel.quantity,
      });
      subtotalCents += totalCents;
      itemsData.push({
        upsellId: upsell.id,
        title: upsell.title,
        pricingType: upsell.pricingType,
        unitPriceCents: upsell.priceCents,
        quantity: sel.quantity,
        totalCents,
      });
    }

    const applicationFeeCents = computeApplicationFeeCents(subtotalCents);

    const order = await prisma.order.create({
      data: {
        reservationId: reservation.id,
        hostId: host.id,
        status: "PENDING",
        subtotalCents,
        applicationFeeCents,
        currency,
        guestEmail: body.guestEmail,
        items: { create: itemsData },
      },
    });

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: subtotalCents,
      currency,
      automatic_payment_methods: { enabled: true }, // card + Apple Pay + Google Pay
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: host.stripeAccountId },
      receipt_email: body.guestEmail,
      description: `Upgrades for ${reservation.listing.name}`,
      metadata: {
        orderId: order.id,
        reservationId: reservation.id,
        listingId: reservation.listingId,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
      subtotalCents,
      currency,
    });
  });
}
