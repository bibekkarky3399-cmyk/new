import "server-only";
import { NextResponse } from "next/server";
import { requireSessionWithUser } from "@/lib/session";

/**
 * Resolves the authenticated user + restaurant for a route handler, or
 * returns a 401 response. Every dashboard API route must scope its
 * Prisma queries by `restaurant.id` to keep tenant data isolated.
 */
export async function requireAuthContext() {
  const ctx = await requireSessionWithUser();
  if (!ctx) {
    return {
      ctx: null,
      unauthorized: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    } as const;
  }
  return { ctx, unauthorized: null } as const;
}
