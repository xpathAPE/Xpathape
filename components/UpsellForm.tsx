"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpsellForm({
  listings,
}: {
  listings: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    photoUrl: "",
    category: "ROOM_UPGRADE",
    pricingType: "FLAT",
    price: "",
    listingId: "",
    maxPerDay: "",
    leadTimeCutoffHours: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const priceCents = Math.round(parseFloat(form.price) * 100);
      if (!Number.isFinite(priceCents) || priceCents < 50) {
        throw new Error("Enter a price of at least $0.50");
      }
      const res = await fetch("/api/upsells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          photoUrl: form.photoUrl || undefined,
          category: form.category,
          pricingType: form.pricingType,
          priceCents,
          currency: "usd",
          listingId: form.listingId || null,
          maxPerDay: form.maxPerDay ? parseInt(form.maxPerDay, 10) : null,
          leadTimeCutoffHours: form.leadTimeCutoffHours
            ? parseInt(form.leadTimeCutoffHours, 10)
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create upsell");
      }
      setForm({
        title: "",
        description: "",
        photoUrl: "",
        category: "ROOM_UPGRADE",
        pricingType: "FLAT",
        price: "",
        listingId: "",
        maxPerDay: "",
        leadTimeCutoffHours: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create upsell");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-1">
        <label className="label">Title *</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="Early check-in (12pm)"
        />
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
          <option value="ROOM_UPGRADE">Room Upgrade</option>
          <option value="EARLY_CHECKIN">Early Check-in</option>
          <option value="LATE_CHECKOUT">Late Checkout</option>
          <option value="AMENITY">Amenity</option>
          <option value="EXPERIENCE">Experience</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="label">Applies to</label>
        <select className="input" value={form.listingId} onChange={(e) => set("listingId", e.target.value)}>
          <option value="">All listings (global)</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Pricing *</label>
        <select
          className="input"
          value={form.pricingType}
          onChange={(e) => set("pricingType", e.target.value)}
        >
          <option value="FLAT">Flat fee (per stay)</option>
          <option value="PER_NIGHT">Per night</option>
          <option value="PER_GUEST">Per guest</option>
        </select>
      </div>
      <div>
        <label className="label">Price (USD) *</label>
        <input
          className="input"
          type="number"
          min="0.5"
          step="0.01"
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
          required
          placeholder="50.00"
        />
      </div>
      <div>
        <label className="label">Photo URL</label>
        <input
          className="input"
          type="url"
          value={form.photoUrl}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="https://…/photo.jpg"
        />
      </div>
      <div>
        <label className="label">Daily inventory cap</label>
        <input
          className="input"
          type="number"
          min="1"
          value={form.maxPerDay}
          onChange={(e) => set("maxPerDay", e.target.value)}
          placeholder="e.g. 1 (blank = unlimited)"
        />
      </div>
      <div>
        <label className="label">Cutoff (hours before check-in)</label>
        <input
          className="input"
          type="number"
          min="0"
          value={form.leadTimeCutoffHours}
          onChange={(e) => set("leadTimeCutoffHours", e.target.value)}
          placeholder="e.g. 12 (blank = none)"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label">Description</label>
        <textarea
          className="input"
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Check in from 12pm instead of 4pm — perfect after an early flight."
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}
      <div className="sm:col-span-2 lg:col-span-3">
        <button className="btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create upsell"}
        </button>
      </div>
    </form>
  );
}
