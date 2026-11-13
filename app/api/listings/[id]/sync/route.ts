import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { syncListingIcal } from "@/lib/pms";

type Params = { params: Promise<{ id: string }> };

/** Manually trigger an iCal sync for one listing. */
export async function POST(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const host = await requireHost();
    const { id } = await params;
    const listing = await prisma.listing.findFirst({ where: { id, hostId: host.id } });
    if (!listing) return jsonError("Listing not found", 404);
    const result = await syncListingIcal(id);
    return NextResponse.json(result);
  });
}
