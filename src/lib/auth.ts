import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "qr_menu_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  restaurantId: string;
  role: "OWNER" | "STAFF";
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET environment variable must be set to a strong random value"
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getAuthSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    // Pin the accepted algorithm explicitly rather than trusting the
    // token's own header, so a forged token can't switch algorithms
    // (e.g. to "none") to bypass signature verification.
    const decoded = jwt.verify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "userId" in decoded &&
      "restaurantId" in decoded &&
      "role" in decoded
    ) {
      return decoded as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
