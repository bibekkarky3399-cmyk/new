"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";

interface Summary {
  range: { from: string; to: string };
  totalOrders: number;
  totalRevenueCents: number;
  avgOrderCents: number;
  topItems: { name: string; quantity: number; revenueCents: number }[];
  byDay: { date: string; revenueCents: number; orders: number }[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ReportsView({ currency }: { currency: string }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDate(d);
  });
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Refetching on every date-range change needs to re-show the loading
    // state, so this can't be folded into the initial useState value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/reports/summary?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <a
          href={`/api/reports/export?from=${from}&to=${to}`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Export CSV
        </a>
      </div>

      {loading && <p className="mt-6 text-slate-500">Loading…</p>}

      {!loading && summary && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total orders</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {summary.totalOrders}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total revenue</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatMoney(summary.totalRevenueCents, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Average order</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatMoney(summary.avgOrderCents, currency)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Top items</h3>
              {summary.topItems.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No sales yet.</p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {summary.topItems.map((item) => (
                      <tr key={item.name} className="border-t border-slate-100">
                        <td className="py-2 text-slate-700">{item.name}</td>
                        <td className="py-2 text-right text-slate-500">
                          ×{item.quantity}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900">
                          {formatMoney(item.revenueCents, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">By day</h3>
              {summary.byDay.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No sales yet.</p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {summary.byDay.map((day) => (
                      <tr key={day.date} className="border-t border-slate-100">
                        <td className="py-2 text-slate-700">{day.date}</td>
                        <td className="py-2 text-right text-slate-500">
                          {day.orders} orders
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900">
                          {formatMoney(day.revenueCents, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
