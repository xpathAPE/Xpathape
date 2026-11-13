import type { TriggerType } from "@prisma/client";

export interface TemplateContext {
  guestName: string;
  listingName: string;
  storefrontUrl: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
}

const DEFAULTS: Record<TriggerType, { subject: string; body: string }> = {
  BOOKING_CONFIRMED: {
    subject: "Your stay at {{listing_name}} — guest portal & upgrades",
    body:
      "Hi {{guest_name}},\n\n" +
      "Thanks for booking {{listing_name}}! Your personal guest portal is ready — " +
      "find check-in details and optional upgrades for your stay here:\n\n{{storefront_url}}\n\n" +
      "— {{host_name}}",
  },
  PRE_CHECKIN_72H: {
    subject: "Arriving soon — upgrades available for {{listing_name}}",
    body:
      "Hi {{guest_name}},\n\n" +
      "You check in on {{check_in}}. Early check-in, amenities and more are still available " +
      "in your guest portal:\n\n{{storefront_url}}\n\n" +
      "— {{host_name}}",
  },
  CHECKOUT_MORNING: {
    subject: "Checking out today? Late checkout may be available",
    body:
      "Hi {{guest_name}},\n\n" +
      "Hope you enjoyed {{listing_name}}! If you'd like a little more time this morning, " +
      "late checkout is available in your guest portal:\n\n{{storefront_url}}\n\n" +
      "— {{host_name}}",
  },
};

export function renderTemplate(
  type: TriggerType,
  ctx: TemplateContext,
  customBody?: string | null
): { subject: string; body: string } {
  const def = DEFAULTS[type];
  const fill = (s: string) =>
    s
      .replace(/\{\{\s*guest_name\s*\}\}/g, ctx.guestName)
      .replace(/\{\{\s*listing_name\s*\}\}/g, ctx.listingName)
      .replace(/\{\{\s*storefront_url\s*\}\}/g, ctx.storefrontUrl)
      .replace(/\{\{\s*host_name\s*\}\}/g, ctx.hostName)
      .replace(/\{\{\s*check_in\s*\}\}/g, ctx.checkIn)
      .replace(/\{\{\s*check_out\s*\}\}/g, ctx.checkOut);
  return {
    subject: fill(def.subject),
    body: fill(customBody?.trim() ? customBody : def.body),
  };
}
