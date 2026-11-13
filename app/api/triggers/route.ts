import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle } from "@/lib/api";

const schema = z.object({
  type: z.enum(["BOOKING_CONFIRMED", "PRE_CHECKIN_72H", "CHECKOUT_MORNING"]),
  channel: z.enum(["EMAIL", "SMS", "PMS"]),
  enabled: z.boolean(),
  template: z.string().max(4000).nullable().optional(),
});

export async function GET() {
  return handle(async () => {
    const host = await requireHost();
    const triggers = await prisma.messageTrigger.findMany({
      where: { hostId: host.id },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    });
    return NextResponse.json(triggers);
  });
}

/** Upsert a trigger setting (type+channel unique per host). */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const host = await requireHost();
    const body = schema.parse(await req.json());
    const trigger = await prisma.messageTrigger.upsert({
      where: {
        hostId_type_channel: { hostId: host.id, type: body.type, channel: body.channel },
      },
      update: { enabled: body.enabled, template: body.template ?? null },
      create: {
        hostId: host.id,
        type: body.type,
        channel: body.channel,
        enabled: body.enabled,
        template: body.template ?? null,
      },
    });
    return NextResponse.json(trigger);
  });
}
