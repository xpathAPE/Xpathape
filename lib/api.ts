import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler body with uniform error handling. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse | T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UnauthorizedError) return jsonError("Unauthorized", 401);
    if (err instanceof ZodError) {
      return jsonError(err.errors.map((e) => e.message).join("; "), 422);
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonError(message, 500);
  }
}
