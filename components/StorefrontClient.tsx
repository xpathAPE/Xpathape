"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM_UPGRADE: "Room Upgrades",
  EARLY_CHECKIN: "Early Check-in",
  LATE_CHECKOUT: "Late Checkout",
  AMENITY: "Amenities",
  EXPERIENCE: "Experiences",
  OTHER: "More",
};

interface UpsellView {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  category: string;
  pricingType: string;
  priceCents: number;
  currency: string;
  computedTotalCents: number;
}

interface Props {
  token: string;
  listing: { name: string; address: string | null; photoUrl: string | null };
  host: { name: string; stripeReady: boolean };
  reservation: {
    guestName: string | null;
    checkIn: string;
    checkOut: string;
    guestCount: number;
    nights: number;
  };
  upsells: UpsellView[];
  publishableKey: string;
}

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function priceSuffix(pricingType: string) {
  if (pricingType === "PER_NIGHT") return "/night";
  if (pricingType === "PER_GUEST") return "/guest";
  return "";
}

export default function StorefrontClient(props: Props) {
  const { token, listing, host, reservation, upsells, publishableKey } = props;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkout, setCheckout] = useState<{ clientSecret: string; orderId: string } | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const totalCents = upsells
    .filter((u) => selected.has(u.id))
    .reduce((sum, u) => sum + u.computedTotalCents, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, UpsellView[]>();
    for (const u of upsells) {
      const list = map.get(u.category) ?? [];
      list.push(u);
      map.set(u.category, list);
    }
    return map;
  }, [upsells]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCheckout(null);
  }

  async function startCheckout() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Array.from(selected).map((upsellId) => ({ upsellId, quantity: 1 })),
          guestEmail: guestEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      setCheckout({ clientSecret: data.clientSecret, orderId: data.orderId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setCreating(false);
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-40">
      {/* Header */}
      <header className="relative">
        {listing.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photoUrl} alt="" className="h-44 w-full object-cover" />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-brand-600 to-brand-700" />
        )}
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold">{listing.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {reservation.guestName ? `${reservation.guestName} · ` : ""}
            {fmtDate(reservation.checkIn)} – {fmtDate(reservation.checkOut)} ·{" "}
            {reservation.nights} night{reservation.nights === 1 ? "" : "s"} ·{" "}
            {reservation.guestCount} guest{reservation.guestCount === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Welcome! {host.name} has prepared optional upgrades to make your stay even better.
          </p>
        </div>
      </header>

      {/* Upsell list */}
      <div className="space-y-6 px-5">
        {upsells.length === 0 && (
          <div className="card text-sm text-slate-500">
            No upgrades are currently available for this stay.
          </div>
        )}
        {Array.from(grouped.entries()).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="space-y-3">
              {items.map((u) => {
                const isSelected = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={`card flex w-full items-center gap-3 text-left transition ${
                      isSelected ? "border-brand-500 ring-2 ring-brand-100" : "hover:border-slate-300"
                    }`}
                  >
                    {u.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photoUrl} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                        ✨
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{u.title}</p>
                      {u.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{u.description}</p>
                      )}
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {money(u.priceCents, u.currency)}
                        <span className="text-slate-400">{priceSuffix(u.pricingType)}</span>
                        {u.computedTotalCents !== u.priceCents && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({money(u.computedTotalCents, u.currency)} total)
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        isSelected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky checkout bar / payment sheet */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-lg space-y-3 px-5 py-4">
            {!checkout ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    {selected.size} upgrade{selected.size === 1 ? "" : "s"} selected
                  </p>
                  <p className="text-lg font-bold">{money(totalCents)}</p>
                </div>
                <input
                  className="input"
                  type="email"
                  placeholder="Email for your receipt"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!host.stripeReady ? (
                  <p className="text-sm text-amber-600">
                    This host isn&apos;t accepting payments yet — check back soon.
                  </p>
                ) : (
                  <button
                    className="btn-primary w-full py-3 text-base"
                    onClick={startCheckout}
                    disabled={creating || !publishableKey}
                  >
                    {creating ? "Preparing…" : `Continue to payment · ${money(totalCents)}`}
                  </button>
                )}
              </>
            ) : stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: checkout.clientSecret, appearance: { theme: "stripe" } }}
              >
                <PaymentForm token={token} totalCents={totalCents} onBack={() => setCheckout(null)} />
              </Elements>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

function PaymentForm({
  token,
  totalCents,
  onBack,
}: {
  token: string;
  totalCents: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/s/${token}/success`,
      },
    });
    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-3">
      <PaymentElement options={{ layout: "accordion" }} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={paying}>
          Back
        </button>
        <button className="btn-primary flex-1 py-3" disabled={!stripe || paying}>
          {paying ? "Processing…" : `Pay ${money(totalCents)}`}
        </button>
      </div>
    </form>
  );
}
