import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { handle, jsonError } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = schema.parse(await req.json());
    const existing = await prisma.host.findUnique({ where: { email: body.email } });
    if (existing) return jsonError("An account with that email already exists", 409);

    const host = await prisma.host.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        // Default messaging triggers (host can toggle in Settings)
        messageTriggers: {
          create: [
            { type: "BOOKING_CONFIRMED", channel: "EMAIL", enabled: true },
            { type: "PRE_CHECKIN_72H", channel: "EMAIL", enabled: true },
            { type: "CHECKOUT_MORNING", channel: "EMAIL", enabled: true },
          ],
        },
      },
    });
    await createSessionCookie(host.id);
    return NextResponse.json({ id: host.id, email: host.email }, { status: 201 });
  });
}
