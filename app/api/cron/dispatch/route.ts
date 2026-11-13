import { NextRequest, NextResponse } from "next/server";
import { dispatchDueMessages } from "@/lib/messaging/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Messaging dispatcher — run every 15 minutes via external cron
 * (Vercel Cron, GitHub Actions, etc.):
 *   curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/dispatch
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await dispatchDueMessages();
  return NextResponse.json({ dispatched: results.length, results });
}
