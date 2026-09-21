export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(cents / 100);
}

/** Computes subtotal/tax/total (all in cents) from line items and a tax rate in basis points. */
export function computeOrderTotals(
  lineTotalsCents: number[],
  taxRateBps: number
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lineTotalsCents.reduce((sum, v) => sum + v, 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10000);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}
