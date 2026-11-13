import { notFound } from "next/navigation";
import { getStorefrontData } from "@/lib/storefront";
import StorefrontClient from "@/components/StorefrontClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function StorefrontPage({ params }: Params) {
  const { token } = await params;
  const data = await getStorefrontData(token);
  if (!data) notFound();

  return (
    <StorefrontClient
      token={token}
      listing={data.listing}
      host={data.host}
      reservation={{
        guestName: data.reservation.guestName,
        checkIn: data.reservation.checkIn.toISOString(),
        checkOut: data.reservation.checkOut.toISOString(),
        guestCount: data.reservation.guestCount,
        nights: data.reservation.nights,
      }}
      upsells={data.upsells}
      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
    />
  );
}
