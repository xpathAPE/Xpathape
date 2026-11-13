import { randomBytes } from "crypto";

/** Unguessable, URL-safe token for guest storefront links. */
export function generateStorefrontToken(): string {
  return randomBytes(18).toString("base64url");
}
