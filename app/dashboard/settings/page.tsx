import { prisma } from "@/lib/db";
import { getCurrentHost } from "@/lib/auth";
import StripeConnectCard from "@/components/StripeConnectCard";
import PmsConnectForm from "@/components/PmsConnectForm";
import TriggerSettings from "@/components/TriggerSettings";

export default async function SettingsPage() {
  const host = (await getCurrentHost())!;
  const [pmsConnections, triggers] = await Promise.all([
    prisma.pmsConnection.findMany({ where: { hostId: host.id } }),
    prisma.messageTrigger.findMany({
      where: { hostId: host.id },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <StripeConnectCard
        connected={Boolean(host.stripeAccountId)}
        onboarded={host.stripeOnboarded}
      />

      <section className="card">
        <h2 className="font-semibold">PMS connections</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect Hospitable or Hostaway to import listings and reservations automatically —
          and deliver storefront links through the Airbnb message thread.
        </p>
        <div className="mt-4">
          <PmsConnectForm
            connections={pmsConnections.map((c) => ({
              provider: c.provider,
              lastSync: c.lastSync?.toISOString() ?? null,
            }))}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Automated messaging</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each enabled trigger sends the guest their storefront link automatically. Variables:{" "}
          <code className="rounded bg-slate-100 px-1">{"{{guest_name}}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1">{"{{listing_name}}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1">{"{{storefront_url}}"}</code>
        </p>
        <div className="mt-4">
          <TriggerSettings
            triggers={triggers.map((t) => ({
              type: t.type,
              channel: t.channel,
              enabled: t.enabled,
              template: t.template,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
