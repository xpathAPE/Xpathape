import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  icalUrl: z.string().url().optional().or(z.literal("")),
  timezone: z.string().max(60).optional(),
});

export async function GET() {
  return handle(async () => {
    const host = await requireHost();
    const listings = await prisma.listing.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reservations: true, upsells: true } } },
    });
    return NextResponse.json(listings);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const host = await requireHost();
    const body = createSchema.parse(await req.json());
    const listing = await prisma.listing.create({
      data: {
        hostId: host.id,
        name: body.name,
        address: body.address || null,
        photoUrl: body.photoUrl || null,
        icalUrl: body.icalUrl || null,
        timezone: body.timezone || "UTC",
      },
    });
    return NextResponse.json(listing, { status: 201 });
  });
}
