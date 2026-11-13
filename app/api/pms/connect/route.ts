import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { adapterFor, syncHostPms } from "@/lib/pms";

const schema = z.object({
  provider: z.enum(["HOSPITABLE", "HOSTAWAY"]),
  apiKey: z.string().min(8, "API key looks too short"),
  accountId: z.string().optional(), // required for Hostaway
});

/** Connect a PMS account, verify credentials, then run an initial sync. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const host = await requireHost();
    const body = schema.parse(await req.json());
    if (body.provider === "HOSTAWAY" && !body.accountId) {
      return jsonError("Hostaway requires an Account ID", 422);
    }

    const connection = await prisma.pmsConnection.upsert({
      where: { hostId_provider: { hostId: host.id, provider: body.provider } },
      update: { apiKey: body.apiKey, accountId: body.accountId ?? null },
      create: {
        hostId: host.id,
        provider: body.provider,
        apiKey: body.apiKey,
        accountId: body.accountId ?? null,
      },
    });

    // Verify credentials with a listings call before claiming success.
    try {
      await adapterFor(connection).fetchListings();
    } catch (err) {
      await prisma.pmsConnection.delete({ where: { id: connection.id } });
      return jsonError(
        `Could not verify ${body.provider} credentials: ${err instanceof Error ? err.message : "unknown error"}`,
        422
      );
    }

    const sync = await syncHostPms(host.id);
    return NextResponse.json({ connected: true, sync });
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const host = await requireHost();
    const provider = new URL(req.url).searchParams.get("provider");
    if (provider !== "HOSPITABLE" && provider !== "HOSTAWAY") {
      return jsonError("provider query param required", 422);
    }
    await prisma.pmsConnection.deleteMany({ where: { hostId: host.id, provider } });
    return NextResponse.json({ ok: true });
  });
}
