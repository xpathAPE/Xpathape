"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIGGER_TYPES = [
  { type: "BOOKING_CONFIRMED", label: "On booking confirmation" },
  { type: "PRE_CHECKIN_72H", label: "72 hours before check-in" },
  { type: "CHECKOUT_MORNING", label: "Checkout morning (skips turnover days)" },
] as const;

const CHANNELS = [
  { channel: "EMAIL", label: "Email" },
  { channel: "SMS", label: "SMS" },
  { channel: "PMS", label: "Airbnb via PMS" },
] as const;

type Trigger = {
  type: string;
  channel: string;
  enabled: boolean;
  template: string | null;
};

export default function TriggerSettings({ triggers }: { triggers: Trigger[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function current(type: string, channel: string): Trigger | undefined {
    return triggers.find((t) => t.type === type && t.channel === channel);
  }

  async function toggle(type: string, channel: string, enabled: boolean) {
    const key = `${type}:${channel}`;
    setBusyKey(key);
    await fetch("/api/triggers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        channel,
        enabled,
        template: current(type, channel)?.template ?? null,
      }),
    });
    router.refresh();
    setBusyKey(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Trigger</th>
            {CHANNELS.map((c) => (
              <th key={c.channel} className="px-4 py-2 text-center">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {TRIGGER_TYPES.map((t) => (
            <tr key={t.type}>
              <td className="py-3 pr-4 font-medium">{t.label}</td>
              {CHANNELS.map((c) => {
                const trig = current(t.type, c.channel);
                const key = `${t.type}:${c.channel}`;
                return (
                  <td key={c.channel} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={trig?.enabled ?? false}
                      disabled={busyKey === key}
                      onChange={(e) => toggle(t.type, c.channel, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-400">
        SMS requires guest phone numbers (synced from your PMS). “Airbnb via PMS” relays the
        message through your connected Hospitable/Hostaway account so it lands in the Airbnb
        thread.
      </p>
    </div>
  );
}
