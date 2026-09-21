import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
  createOrderSchema,
  settingsSchema,
} from "@/lib/validation";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      restaurantName: "Rosa's Café",
      name: "Rosa",
      email: "Rosa@Example.com",
      password: "supersecret",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("rosa@example.com");
    }
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      restaurantName: "Rosa's Café",
      name: "Rosa",
      email: "rosa@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      restaurantName: "Rosa's Café",
      name: "Rosa",
      email: "not-an-email",
      password: "supersecret",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "rosa@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("requires at least one item", () => {
    const result = createOrderSchema.safeParse({
      restaurantSlug: "rosas-cafe",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid order", () => {
    const result = createOrderSchema.safeParse({
      restaurantSlug: "rosas-cafe",
      items: [{ menuItemId: "item_1", quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative quantity", () => {
    const result = createOrderSchema.safeParse({
      restaurantSlug: "rosas-cafe",
      items: [{ menuItemId: "item_1", quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("rejects a malformed hex color", () => {
    const result = settingsSchema.safeParse({
      name: "Rosa's Café",
      currency: "USD",
      taxRateBps: 825,
      primaryColor: "not-a-color",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid settings payload", () => {
    const result = settingsSchema.safeParse({
      name: "Rosa's Café",
      currency: "USD",
      taxRateBps: 825,
      primaryColor: "#7c2d12",
    });
    expect(result.success).toBe(true);
  });
});
