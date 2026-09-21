import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from "@/lib/auth";

describe("password hashing", () => {
  it("hashes and verifies a matching password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(
      true
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("session tokens", () => {
  const payload = {
    userId: "user_1",
    restaurantId: "restaurant_1",
    role: "OWNER" as const,
  };

  it("round-trips a valid session payload", () => {
    const token = signSession(payload);
    // The decoded token also carries JWT's standard iat/exp claims, so this
    // checks the payload fields we actually care about rather than exact
    // deep equality.
    expect(verifySession(token)).toMatchObject(payload);
  });

  it("rejects a tampered token", () => {
    const token = signSession(payload);
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySession("not-a-jwt")).toBeNull();
  });
});
