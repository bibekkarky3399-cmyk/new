"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { OrderDTO, OrderStatus } from "@/lib/types";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Received" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY", label: "Ready" },
  { status: "SERVED", label: "Served" },
];

export function OrderTracker({
  orderId,
  restaurantName,
  currency,
  initialOrder,
}: {
  orderId: string;
  restaurantName: string;
  currency: string;
  initialOrder: OrderDTO;
}) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setOrder(data.order);
      } catch {
        // transient network error, retry on next tick
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const cancelled = order.status === "CANCELLED";
  const activeIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">{restaurantName}</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Order status
        </h1>
        {order.tableLabel && (
          <p className="mt-1 text-sm text-slate-500">{order.tableLabel}</p>
        )}

        {cancelled ? (
          <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            This order was cancelled.
          </p>
        ) : (
          <ol className="mt-6 flex justify-between">
            {STEPS.map((step, i) => (
              <li key={step.status} className="flex flex-1 flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    i <= activeIndex ? "bg-slate-900" : "bg-slate-200"
                  }`}
                />
                <span
                  className={`mt-2 text-center text-xs ${
                    i <= activeIndex
                      ? "font-semibold text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 divide-y divide-slate-200 border-t border-slate-200">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {item.quantity}× {item.nameSnapshot}
                </p>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {item.selectedOptions.map((o) => o.choiceName).join(", ")}
                  </p>
                )}
              </div>
              <span className="font-medium text-slate-900">
                {formatMoney(item.unitPriceCents * item.quantity, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotalCents, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>{formatMoney(order.taxCents, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatMoney(order.totalCents, currency)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
