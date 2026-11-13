import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function SuccessPage({ params }: Props) {
  const { token } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { storefrontToken: token },
    include: { listing: true },
  });
  if (!reservation) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="mt-4 text-2xl font-bold">You&apos;re all set!</h1>
      <p className="mt-2 text-slate-600">
        Your upgrades for <strong>{reservation.listing.name}</strong> are confirmed. A receipt
        is on its way to your email, and your host has been notified.
      </p>
      <Link href={`/s/${token}`} className="btn-secondary mt-6">
        Back to guest portal
      </Link>
    </main>
  );
}
