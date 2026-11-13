"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PmsConnectForm({
  connections,
}: {
  connections: Array<{ provider: string; lastSync: string | null }>;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<"HOSPITABLE" | "HOSTAWAY">("HOSPITABLE");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          accountId: provider === "HOSTAWAY" ? accountId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      setMessage(
        `Connected! Imported ${data.sync.listingsImported} listings, synced ${data.sync.reservationsUpserted} reservations.`
      );
      setApiKey("");
      setAccountId("");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(p: string) {
    if (!confirm(`Disconnect ${p}? Synced listings and reservations are kept.`)) return;
    await fetch(`/api/pms/connect?provider=${p}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {connections.length > 0 && (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li
              key={c.provider}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span>
                <strong>{c.provider}</strong>{" "}
                <span className="text-slate-500">
                  {c.lastSync ? `· last sync ${c.lastSync.slice(0, 16).replace("T", " ")} UTC` : "· never synced"}
                </span>
              </span>
              <button className="btn-danger px-2 py-1 text-xs" onClick={() => disconnect(c.provider)}>
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={connect} className="grid gap-3 sm:grid-cols-4">
        <select
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value as "HOSPITABLE" | "HOSTAWAY")}
        >
          <option value="HOSPITABLE">Hospitable</option>
          <option value="HOSTAWAY">Hostaway</option>
        </select>
        {provider === "HOSTAWAY" && (
          <input
            className="input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Hostaway Account ID"
            required
          />
        )}
        <input
          className={`input ${provider === "HOSTAWAY" ? "" : "sm:col-span-2"}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === "HOSPITABLE" ? "Personal Access Token" : "API key (client secret)"}
          required
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Verifying…" : "Connect & sync"}
        </button>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
