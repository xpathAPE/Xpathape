import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Returns the authenticated host or null. Use in server components / route handlers. */
export async function getCurrentHost() {
  const session = await getSession();
  if (!session) return null;
  return prisma.host.findUnique({ where: { id: session.hostId } });
}

/** Throws a 401-style error object for API routes when unauthenticated. */
export async function requireHost() {
  const host = await getCurrentHost();
  if (!host) throw new UnauthorizedError();
  return host;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
