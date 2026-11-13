import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(300).nullable().optional(),
  photoUrl: z.string().url().nullable().optional().or(z.literal("")),
  icalUrl: z.string().url().nullable().optional().or(z.literal("")),
  timezone: z.string().max(60).optional(),
  active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const host = await requireHost();
    const { id } = await params;
    const listing = await prisma.listing.findFirst({ where: { id, hostId: host.id } });
    if (!listing) return jsonError("Listing not found", 404);
    const body = updateSchema.parse(await req.json());
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl || null } : {}),
        ...(body.icalUrl !== undefined ? { icalUrl: body.icalUrl || null } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
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
    const listing = await prisma.listing.findFirst({ where: { id, hostId: host.id } });
    if (!listing) return jsonError("Listing not found", 404);
    await prisma.listing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
