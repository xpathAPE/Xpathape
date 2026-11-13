import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const host = await requireHost();
    const orders = await prisma.order.findMany({
      where: { hostId: host.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: true,
        reservation: { include: { listing: { select: { name: true } } } },
      },
    });
    return NextResponse.json(orders);
  });
}
