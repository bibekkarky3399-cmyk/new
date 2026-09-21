"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { computeOrderTotals } from "@/lib/money";
import type { CartLine } from "@/components/public/types";

export function CartPanel({
  cart,
  currency,
  taxRateBps,
  onClose,
  onUpdateQuantity,
  onCheckout,
}: {
  cart: CartLine[];
  currency: string;
  taxRateBps: number;
  onClose: () => void;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onCheckout: (customerName: string, notes: string) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineTotals = cart.map((l) => l.unitPriceCents * l.quantity);
  const { subtotalCents, taxCents, totalCents } = computeOrderTotals(
    lineTotals,
    taxRateBps
  );

  async function handleCheckout() {
    if (cart.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      await onCheckout(customerName.trim(), notes.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your order</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="mt-6 text-center text-slate-500">Your cart is empty.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {cart.map((line) => (
                <div key={line.key} className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{line.name}</p>
                    {line.selectedOptions.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {line.selectedOptions.map((o) => o.choiceName).join(", ")}
                      </p>
                    )}
                    {line.notes && (
                      <p className="text-xs italic text-slate-500">
                        {line.notes}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(line.unitPriceCents * line.quantity, currency)}
                    </p>
                  </div>
                  <div className="flex items-center rounded-md border border-slate-300">
                    <button
                      onClick={() =>
                        onUpdateQuantity(line.key, line.quantity - 1)
                      }
                      className="px-2 py-1"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(line.key, line.quantity + 1)
                      }
                      className="px-2 py-1"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(subtotalCents, currency)}</span>
              </div>
              {taxRateBps > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{formatMoney(taxCents, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(totalCents, currency)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Name (optional)
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Order notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={placing}
              className="mt-5 w-full rounded-md bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {placing ? "Placing order…" : `Place order — ${formatMoney(totalCents, currency)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
