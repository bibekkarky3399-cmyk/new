import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

// A precomputed bcrypt hash with no matching plaintext password. Used to run
// a real bcrypt comparison even when the email isn't registered, so the
// response time doesn't reveal (via a timing side-channel) whether an
// account exists.
const DUMMY_PASSWORD_HASH =
  "$2b$12$OHcWptdvXbslc17v/xrC9OtK30HeCH1RKFU52KEZG.qWOjocPf3JS";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { restaurant: true },
  });

  // Constant-shape, constant-time response whether the user exists or not,
  // to avoid leaking which emails are registered.
  const invalidResponse = () =>
    NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !valid) return invalidResponse();

  const token = signSession({
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    restaurant: {
      id: user.restaurant.id,
      name: user.restaurant.name,
      slug: user.restaurant.slug,
    },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
