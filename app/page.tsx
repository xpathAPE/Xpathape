import Link from "next/link";
import { getCurrentHost } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const host = await getCurrentHost();
  if (host) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <span className="badge bg-brand-100 text-brand-700">For short-term rental hosts</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Turn every booking into more revenue
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        Upstay gives every guest a branded post-booking storefront for room upgrades,
        early check-in, late checkout, amenities and experiences — delivered
        automatically, paid instantly via Stripe.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn-primary px-6 py-3 text-base">
          Start free
        </Link>
        <Link href="/login" className="btn-secondary px-6 py-3 text-base">
          Sign in
        </Link>
      </div>
      <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        {[
          ["Sync bookings", "Connect Hospitable or Hostaway, or paste your Airbnb iCal link."],
          ["Build upsells", "Flat, per-night or per-guest pricing with inventory caps and cutoffs."],
          ["Get paid", "Guests pay in seconds with Apple Pay — funds land in your Stripe account."],
        ].map(([title, body]) => (
          <div key={title} className="card">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
