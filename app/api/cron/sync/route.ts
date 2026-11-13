import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncHostPms, syncListingIcal } from "@/lib/pms";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Calendar/PMS sync — run hourly via external cron:
 *   curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/sync
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = { pmsHostsSynced: 0, icalListingsSynced: 0, errors: [] as string[] };

  const hostsWithPms = await prisma.pmsConnection.findMany({
    select: { hostId: true },
    distinct: ["hostId"],
  });
  for (const { hostId } of hostsWithPms) {
    const r = await syncHostPms(hostId);
    summary.pmsHostsSynced += 1;
    summary.errors.push(...r.errors);
  }

  const icalListings = await prisma.listing.findMany({
    where: { icalUrl: { not: null }, active: true },
    select: { id: true },
  });
  for (const { id } of icalListings) {
    const r = await syncListingIcal(id);
    summary.icalListingsSynced += 1;
    summary.errors.push(...r.errors);
  }

  return NextResponse.json(summary);
}
