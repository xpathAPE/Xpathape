import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { upsellSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const host = await requireHost();
    const { id } = await params;
    const existing = await prisma.upsell.findFirst({ where: { id, hostId: host.id } });
    if (!existing) return jsonError("Upsell not found", 404);

    const body = upsellSchema.partial().parse(await req.json());
    if (body.listingId) {
      const listing = await prisma.listing.findFirst({
        where: { id: body.listingId, hostId: host.id },
      });
      if (!listing) return jsonError("Listing not found", 404);
    }

    const updated = await prisma.upsell.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl || null } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.pricingType !== undefined ? { pricingType: body.pricingType } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.currency !== undefined ? { currency: body.currency.toLowerCase() } : {}),
        ...(body.listingId !== undefined ? { listingId: body.listingId || null } : {}),
        ...(body.maxPerDay !== undefined ? { maxPerDay: body.maxPerDay } : {}),
        ...(body.leadTimeCutoffHours !== undefined
          ? { leadTimeCutoffHours: body.leadTimeCutoffHours }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const host = await requireHost();
    const { id } = await params;
    const existing = await prisma.upsell.findFirst({ where: { id, hostId: host.id } });
    if (!existing) return jsonError("Upsell not found", 404);
    // Keep order history intact: soft-disable if the upsell has orders.
    const orderCount = await prisma.orderItem.count({ where: { upsellId: id } });
    if (orderCount > 0) {
      await prisma.upsell.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ ok: true, softDeleted: true });
    }
    await prisma.upsell.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
