"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpsellRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/upsells/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this upsell? (It will be kept but deactivated if it has orders.)")) return;
    setBusy(true);
    await fetch(`/api/upsells/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
      <button className="btn-secondary" onClick={toggle} disabled={busy}>
        {active ? "Deactivate" : "Activate"}
      </button>
      <button className="btn-danger" onClick={remove} disabled={busy}>
        Delete
      </button>
    </div>
  );
}
