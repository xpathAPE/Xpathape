import { z } from "zod";

export const upsellSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  category: z.enum([
    "ROOM_UPGRADE",
    "EARLY_CHECKIN",
    "LATE_CHECKOUT",
    "AMENITY",
    "EXPERIENCE",
    "OTHER",
  ]),
  pricingType: z.enum(["FLAT", "PER_NIGHT", "PER_GUEST"]),
  priceCents: z.number().int().min(50, "Minimum price is $0.50").max(10_000_000),
  currency: z.string().length(3).default("usd"),
  listingId: z.string().nullable().optional(),
  maxPerDay: z.number().int().min(1).nullable().optional(),
  leadTimeCutoffHours: z.number().int().min(0).max(24 * 30).nullable().optional(),
  active: z.boolean().optional(),
});
