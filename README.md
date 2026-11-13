# Upstay — Airbnb Host Upsell & Room Upgrade Platform

B2B SaaS that plugs into existing Airbnb host accounts. Since Airbnb has no native
checkout for optional paid upgrades, Upstay generates a branded, post-booking
**guest storefront** for every reservation, automates link delivery, and processes
payments via **Stripe Connect** with an automatic platform fee.

## How it works

1. **Host onboarding & sync** — hosts sign up, connect Stripe Express, then either
   connect a PMS (Hospitable / Hostaway) or paste Airbnb iCal links per listing.
   Listings and reservations import automatically.
2. **Upsell builder** — per-listing or global add-ons with categories
   (Room Upgrade, Early/Late Check-in, Amenities, Experiences), three pricing
   models (**flat per stay, per night, per guest**), daily inventory caps, and
   lead-time cutoffs.
3. **Automated messaging** — triggers on booking confirmation, 72h pre-check-in,
   and checkout morning (with gap detection that skips same-day turnovers).
   Channels: email (Resend), SMS (Twilio), or the Airbnb thread via the PMS API.
4. **Guest storefront** — zero-login, mobile-first page at `/s/{token}` preloaded
   with stay dates and guest count. Real-time price calculation, Apple Pay /
   Google Pay / card via Stripe Payment Element.
5. **Payments** — destination charges to the host's connected account with a
   configurable 3–5% application fee (`PLATFORM_FEE_PERCENT`). Webhook-driven
   order confirmation + instant fulfillment alerts to host/staff. 1-click full
   refunds that reverse the transfer and the platform fee.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL ·
Stripe Connect (Express) · Resend (email) · Twilio (SMS) · Vitest

## Local setup

```bash
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, Stripe test keys
npm install
npm run db:push             # create schema in Postgres
npm run db:seed             # demo host + listings + reservations (optional)
npm run dev
```

Demo login after seeding: `demo@upstay.test` / `password123`. The seed output
prints guest storefront links you can open immediately.

### Stripe test flow

1. Add `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test mode).
2. In the dashboard → Settings, click **Connect Stripe** and complete Express
   onboarding with Stripe's test data.
3. Forward webhooks locally:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   and put the printed secret in `STRIPE_WEBHOOK_SECRET`.
4. Open a reservation's storefront link, select upgrades, pay with `4242 4242 4242 4242`.

### Cron jobs (production)

Schedule two authenticated GETs (Vercel Cron / GitHub Actions / any scheduler):

| Route | Cadence | Purpose |
|---|---|---|
| `/api/cron/sync` | hourly | iCal + PMS reservation sync |
| `/api/cron/dispatch` | every 15 min | automated guest messaging triggers |

Both require `Authorization: Bearer $CRON_SECRET`.

## Project layout

```
app/
  api/            REST endpoints (auth, listings, upsells, storefront checkout,
                  Stripe connect + webhook, orders/refunds, PMS, triggers, cron)
  dashboard/      host dashboard (overview, listings, upsells, reservations,
                  orders, settings)
  s/[token]/      guest storefront + payment success page
components/       client components (forms, checkout, settings)
lib/
  pricing.ts      pricing engine (flat / per-night / per-guest, fees, cutoffs)
  ical.ts         Airbnb iCal parser (RFC 5545 subset)
  storefront.ts   storefront data assembly (availability, inventory, totals)
  pms/            Hospitable + Hostaway adapters & sync engine
  messaging/      email/SMS/PMS dispatchers, trigger scheduler, templates
prisma/           schema + demo seed
tests/            vitest unit tests (pricing, iCal parsing)
```

## Compliance posture

The guest storefront is structured as a **digital guidebook & concierge portal**
delivered post-booking — the industry-standard pattern (ChargeAutomation, Enso
Connect, Hostfully) for ancillary upsells alongside check-in info, keeping hosts
within Airbnb ToS. Direct Airbnb Partner API integration is deferred until scale
(Phase 2).

## Roadmap (Phase 2)

- Smart gap-night detection surfacing early check-in / late checkout dynamically
  (foundation already in the checkout-morning trigger).
- SaaS subscription billing per active listing (Stripe Billing).
- More PMS integrations (Guesty, Hospitable webhooks for instant sync).
- Airbnb Partner API application at 500+ active listings.
