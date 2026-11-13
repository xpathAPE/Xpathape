"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButtons({
  listingId,
  hasPms,
}: {
  listingId?: string;
  hasPms?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const url = listingId ? `/api/listings/${listingId}/sync` : "/api/pms/sync";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const parts = [];
      if (data.listingsImported) parts.push(`${data.listingsImported} listings imported`);
      parts.push(`${data.reservationsUpserted ?? 0} reservations synced`);
      if (data.errors?.length) parts.push(`⚠ ${data.errors.join("; ")}`);
      setMessage(parts.join(" · "));
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (listingId) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-secondary" onClick={sync} disabled={busy}>
          {busy ? "Syncing…" : "Sync iCal"}
        </button>
        {message && <p className="max-w-xs text-right text-xs text-slate-500">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn-primary" onClick={sync} disabled={busy || !hasPms} title={hasPms ? "" : "Connect a PMS in Settings first"}>
        {busy ? "Syncing…" : "Sync from PMS"}
      </button>
      {message && <p className="max-w-sm text-right text-xs text-slate-500">{message}</p>}
    </div>
  );
}
