import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth";
import { handle } from "@/lib/api";
import { syncHostPms } from "@/lib/pms";

/** Manually trigger a full PMS sync for the signed-in host. */
export async function POST() {
  return handle(async () => {
    const host = await requireHost();
    const result = await syncHostPms(host.id);
    return NextResponse.json(result);
  });
}
