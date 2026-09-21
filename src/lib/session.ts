import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Loads the session plus the current user + restaurant, or null if not authenticated. */
export async function requireSessionWithUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { restaurant: true },
  });

  if (!user || user.restaurantId !== session.restaurantId) return null;

  return { session, user, restaurant: user.restaurant };
}
