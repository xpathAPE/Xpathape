import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { handle, jsonError } from "@/lib/api";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = schema.parse(await req.json());
    const host = await prisma.host.findUnique({ where: { email: body.email } });
    if (!host || !(await verifyPassword(body.password, host.passwordHash))) {
      return jsonError("Invalid email or password", 401);
    }
    await createSessionCookie(host.id);
    return NextResponse.json({ id: host.id });
  });
}
