"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { OrderDTO, OrderStatus } from "@/lib/types";

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

export function OrdersBoard({
  initialOrders,
  currency,
}: {
  initialOrders: OrderDTO[];
  currency: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setOrders(data.orders);
      } catch {
        // transient network error, retry on next tick
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // refetch to correct any optimistic-update drift
      const fresh = await fetch("/api/orders", { cache: "no-store" });
      if (fresh.ok) setOrders((await fresh.json()).orders);
    }
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const historyOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div>
      {activeOrders.length === 0 ? (
        <p className="text-slate-500">No active orders right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVE_STATUSES.map((status) => (
            <div key={status}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {STATUS_LABEL[status]}
              </h3>
              <div className="mt-2 space-y-3">
                {activeOrders
                  .filter((o) => o.status === status)
                  .map((order) => {
                    const next = NEXT_STATUS[order.status];
                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">
                            {order.tableLabel ?? "Takeaway"}
                          </p>
                          <span className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {order.customerName && (
                          <p className="text-sm text-slate-500">
                            {order.customerName}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.quantity}× {item.nameSnapshot}
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <span className="text-slate-400">
                                  {" "}
                                  (
                                  {item.selectedOptions
                                    .map((o) => o.choiceName)
                                    .join(", ")}
                                  )
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {order.notes && (
                          <p className="mt-1 text-xs italic text-slate-500">
                            {order.notes}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatMoney(order.totalCents, currency)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {next && (
                            <button
                              onClick={() => updateStatus(order.id, next)}
                              className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Mark {STATUS_LABEL[next]}
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(order.id, "CANCELLED")}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          {showHistory ? "Hide" : "Show"} order history ({historyOrders.length})
        </button>
        {showHistory && (
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {historyOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {order.tableLabel ?? "Takeaway"} ·{" "}
                    <span className="text-slate-500">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatMoney(order.totalCents, currency)}
                </span>
              </div>
            ))}
            {historyOrders.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-500">No history yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
