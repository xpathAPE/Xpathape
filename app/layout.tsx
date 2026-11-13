import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upstay — Upsells for short-term rental hosts",
  description:
    "Post-booking guest storefronts for room upgrades, early check-in, late checkout, amenities and experiences. Payments by Stripe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
