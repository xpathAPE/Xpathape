export type PricingTypeValue = "FLAT" | "PER_NIGHT" | "PER_GUEST";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of nights between check-in and check-out (minimum 1). */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const diff = Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
  return Math.max(1, diff);
}

export interface StayContext {
  nights: number;
  guests: number;
  quantity?: number;
}

/**
 * Compute the total for one upsell line item.
 * FLAT       -> unit price x quantity (per stay)
 * PER_NIGHT  -> unit price x nights x quantity
 * PER_GUEST  -> unit price x guests x quantity
 */
export function computeItemTotalCents(
  pricingType: PricingTypeValue,
  unitPriceCents: number,
  ctx: StayContext
): number {
  const qty = Math.max(1, ctx.quantity ?? 1);
  switch (pricingType) {
    case "FLAT":
      return unitPriceCents * qty;
    case "PER_NIGHT":
      return unitPriceCents * Math.max(1, ctx.nights) * qty;
    case "PER_GUEST":
      return unitPriceCents * Math.max(1, ctx.guests) * qty;
  }
}

/** Platform application fee (rounded to nearest cent). */
export function computeApplicationFeeCents(subtotalCents: number, feePercent?: number): number {
  const pct = feePercent ?? Number(process.env.PLATFORM_FEE_PERCENT ?? 4);
  return Math.round((subtotalCents * pct) / 100);
}

/** Is this upsell still purchasable given its lead-time cutoff? */
export function withinLeadTime(
  leadTimeCutoffHours: number | null | undefined,
  checkIn: Date,
  now: Date = new Date()
): boolean {
  if (leadTimeCutoffHours == null) return true;
  const cutoff = new Date(checkIn.getTime() - leadTimeCutoffHours * 60 * 60 * 1000);
  return now < cutoff;
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
