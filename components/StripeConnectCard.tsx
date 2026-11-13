"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function StripeConnectCardInner({
  connected,
  onboarded,
}: {
  connected: boolean;
  onboarded: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After returning from Stripe onboarding, refresh status once.
  useEffect(() => {
    if (search.get("stripe") === "return") {
      fetch("/api/stripe/connect").then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start Stripe onboarding");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Stripe onboarding");
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Payments (Stripe Connect)</h2>
          <p className="mt-1 text-sm text-slate-500">
            {onboarded
              ? "✅ Connected — upsell payments route to your bank account automatically."
              : connected
                ? "⚠️ Onboarding started but not finished. Complete it to accept payments."
                : "Connect a Stripe Express account to receive upsell payouts."}
          </p>
        </div>
        <button className="btn-primary" onClick={connect} disabled={busy || onboarded}>
          {busy ? "Redirecting…" : onboarded ? "Connected" : connected ? "Resume onboarding" : "Connect Stripe"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

export default function StripeConnectCard(props: { connected: boolean; onboarded: boolean }) {
  return (
    <Suspense>
      <StripeConnectCardInner {...props} />
    </Suspense>
  );
}
