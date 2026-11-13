"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    if (!confirm("Refund this order in full? The charge, transfer and platform fee are all reversed.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Refund failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button className="btn-danger px-3 py-1 text-xs" onClick={refund} disabled={busy}>
        {busy ? "Refunding…" : "Refund"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
