"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ListingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: address || undefined,
          icalUrl: icalUrl || undefined,
          photoUrl: photoUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create listing");
      }
      setName("");
      setAddress("");
      setIcalUrl("");
      setPhotoUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Listing name *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Oceanview Villa"
        />
      </div>
      <div>
        <label className="label">Address</label>
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Beach Rd, Malibu"
        />
      </div>
      <div>
        <label className="label">Airbnb iCal URL</label>
        <input
          className="input"
          type="url"
          value={icalUrl}
          onChange={(e) => setIcalUrl(e.target.value)}
          placeholder="https://www.airbnb.com/calendar/ical/…"
        />
      </div>
      <div>
        <label className="label">Photo URL</label>
        <input
          className="input"
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…/photo.jpg"
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={loading}>
          {loading ? "Adding…" : "Add listing"}
        </button>
      </div>
    </form>
  );
}
