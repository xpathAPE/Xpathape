import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getStripe, appUrl } from "@/lib/stripe";

/**
 * Create (or resume) Stripe Connect Express onboarding for the host.
 * Returns an account link URL to redirect the host to.
 */
export async function POST() {
  return handle(async () => {
    const host = await requireHost();
    const stripe = getStripe();

    let accountId = host.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: host.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: "Short-term rental guest upgrades and add-ons",
        },
        metadata: { hostId: host.id },
      });
      accountId = account.id;
      await prisma.host.update({
        where: { id: host.id },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: appUrl("/dashboard/settings?stripe=refresh"),
      return_url: appUrl("/dashboard/settings?stripe=return"),
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  });
}

/** Refresh onboarding status from Stripe. */
export async function GET() {
  return handle(async () => {
    const host = await requireHost();
    if (!host.stripeAccountId) {
      return NextResponse.json({ connected: false, onboarded: false });
    }
    const account = await getStripe().accounts.retrieve(host.stripeAccountId);
    const onboarded = Boolean(account.charges_enabled && account.payouts_enabled);
    if (onboarded !== host.stripeOnboarded) {
      await prisma.host.update({
        where: { id: host.id },
        data: { stripeOnboarded: onboarded },
      });
    }
    return NextResponse.json({
      connected: true,
      onboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  });
}
