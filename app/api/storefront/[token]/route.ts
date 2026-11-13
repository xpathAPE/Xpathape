import { NextRequest, NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { getStorefrontData } from "@/lib/storefront";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { token } = await params;
    const data = await getStorefrontData(token);
    if (!data) return jsonError("Reservation not found", 404);
    return NextResponse.json(data);
  });
}
