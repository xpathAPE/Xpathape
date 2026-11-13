import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { upsellSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const host = await requireHost();
    const upsells = await prisma.upsell.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { id: true, name: true } } },
    });
    return NextResponse.json(upsells);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const host = await requireHost();
    const body = upsellSchema.parse(await req.json());

    if (body.listingId) {
      const listing = await prisma.listing.findFirst({
        where: { id: body.listingId, hostId: host.id },
      });
      if (!listing) return jsonError("Listing not found", 404);
    }

    const upsell = await prisma.upsell.create({
      data: {
        hostId: host.id,
        listingId: body.listingId || null,
        title: body.title,
        description: body.description || null,
        photoUrl: body.photoUrl || null,
        category: body.category,
        pricingType: body.pricingType,
        priceCents: body.priceCents,
        currency: body.currency.toLowerCase(),
        maxPerDay: body.maxPerDay ?? null,
        leadTimeCutoffHours: body.leadTimeCutoffHours ?? null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json(upsell, { status: 201 });
  });
}
