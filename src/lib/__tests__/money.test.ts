import { describe, expect, it } from "vitest";
import { computeOrderTotals, formatMoney } from "@/lib/money";

describe("computeOrderTotals", () => {
  it("sums line totals with no tax", () => {
    const result = computeOrderTotals([1000, 500], 0);
    expect(result).toEqual({
      subtotalCents: 1500,
      taxCents: 0,
      totalCents: 1500,
    });
  });

  it("applies a basis-point tax rate and rounds to the nearest cent", () => {
    // 8.25% of $10.00 = $0.825 -> rounds to 83 cents
    const result = computeOrderTotals([1000], 825);
    expect(result.subtotalCents).toBe(1000);
    expect(result.taxCents).toBe(83);
    expect(result.totalCents).toBe(1083);
  });

  it("returns zero totals for an empty cart", () => {
    expect(computeOrderTotals([], 1000)).toEqual({
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
});

describe("formatMoney", () => {
  it("formats cents as a currency string", () => {
    expect(formatMoney(1099, "USD")).toBe("$10.99");
  });

  it("formats zero correctly", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });
});
