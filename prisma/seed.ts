/**
 * Demo seed: one host (demo@upstay.test / password123), two listings,
 * a set of upsells, and upcoming reservations with storefront tokens.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const token = () => randomBytes(18).toString("base64url");
const daysFromNow = (d: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + d);
  return date;
};

async function main() {
  const host = await prisma.host.upsert({
    where: { email: "demo@upstay.test" },
    update: {},
    create: {
      email: "demo@upstay.test",
      name: "Demo Host",
      passwordHash: await bcrypt.hash("password123", 10),
      messageTriggers: {
        create: [
          { type: "BOOKING_CONFIRMED", channel: "EMAIL", enabled: true },
          { type: "PRE_CHECKIN_72H", channel: "EMAIL", enabled: true },
          { type: "CHECKOUT_MORNING", channel: "EMAIL", enabled: true },
        ],
      },
    },
  });

  const villa = await prisma.listing.create({
    data: {
      hostId: host.id,
      name: "Oceanview Villa",
      address: "123 Beach Rd, Malibu, CA",
      photoUrl:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
    },
  });
  const cabin = await prisma.listing.create({
    data: {
      hostId: host.id,
      name: "Alpine Cabin",
      address: "9 Summit Trail, Big Bear, CA",
      photoUrl:
        "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80",
    },
  });

  await prisma.upsell.createMany({
    data: [
      {
        hostId: host.id,
        title: "Early check-in (12pm)",
        description: "Skip the wait — your place will be ready from noon.",
        category: "EARLY_CHECKIN",
        pricingType: "FLAT",
        priceCents: 5000,
        leadTimeCutoffHours: 12,
      },
      {
        hostId: host.id,
        title: "Late checkout (2pm)",
        description: "Enjoy a slow morning. Check out at 2pm instead of 10am.",
        category: "LATE_CHECKOUT",
        pricingType: "FLAT",
        priceCents: 5000,
      },
      {
        hostId: host.id,
        listingId: villa.id,
        title: "Pool heating",
        description: "We'll heat the pool to 85°F for your entire stay.",
        category: "AMENITY",
        pricingType: "PER_NIGHT",
        priceCents: 3000,
      },
      {
        hostId: host.id,
        listingId: villa.id,
        title: "Master suite upgrade",
        description: "Upgrade to the ocean-facing master suite with balcony.",
        category: "ROOM_UPGRADE",
        pricingType: "PER_NIGHT",
        priceCents: 7500,
        maxPerDay: 1,
      },
      {
        hostId: host.id,
        title: "Airport pickup",
        description: "Private pickup from LAX, car seats available.",
        category: "EXPERIENCE",
        pricingType: "PER_GUEST",
        priceCents: 1500,
        leadTimeCutoffHours: 24,
      },
      {
        hostId: host.id,
        listingId: cabin.id,
        title: "Kayak rental",
        description: "Two-person kayak delivered to the lake dock.",
        category: "EXPERIENCE",
        pricingType: "FLAT",
        priceCents: 4000,
        maxPerDay: 1,
      },
    ],
  });

  await prisma.reservation.createMany({
    data: [
      {
        listingId: villa.id,
        source: "MANUAL",
        externalId: "seed-1",
        guestName: "Alex Rivera",
        guestEmail: "alex@example.com",
        checkIn: daysFromNow(2),
        checkOut: daysFromNow(6),
        guestCount: 2,
        storefrontToken: token(),
      },
      {
        listingId: villa.id,
        source: "MANUAL",
        externalId: "seed-2",
        guestName: "Sam Chen",
        guestEmail: "sam@example.com",
        checkIn: daysFromNow(10),
        checkOut: daysFromNow(14),
        guestCount: 4,
        storefrontToken: token(),
      },
      {
        listingId: cabin.id,
        source: "MANUAL",
        externalId: "seed-3",
        guestName: "Jordan Lee",
        guestEmail: "jordan@example.com",
        checkIn: daysFromNow(1),
        checkOut: daysFromNow(4),
        guestCount: 3,
        storefrontToken: token(),
      },
    ],
  });

  const tokens = await prisma.reservation.findMany({
    select: { guestName: true, storefrontToken: true },
  });
  console.log("Seeded. Demo login: demo@upstay.test / password123");
  console.log("Guest storefront links:");
  for (const t of tokens) console.log(`  ${t.guestName}: /s/${t.storefrontToken}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
