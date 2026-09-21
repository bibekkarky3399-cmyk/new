"use client";

import { useState } from "react";
import { publicMenuUrl } from "@/lib/urls";

interface TableDTO {
  id: string;
  label: string;
  token: string;
}

export function TableManager({
  initialTables,
  restaurantSlug,
}: {
  initialTables: TableDTO[];
  restaurantSlug: string;
}) {
  const [tables, setTables] = useState(initialTables);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTable() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add table");
      setTables((prev) => [...prev, data.table]);
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add table");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTable(id: string) {
    if (!confirm("Delete this table's QR code?")) return;
    const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTables((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div>
      <div className="flex gap-2 max-w-sm">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTable()}
          placeholder="e.g. Table 5"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={addTable}
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Add table
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tables/${table.id}/qr`}
              alt={`QR code for ${table.label}`}
              className="mx-auto h-32 w-32"
            />
            <p className="mt-2 font-medium text-slate-900">{table.label}</p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {publicMenuUrl(restaurantSlug, table.token)}
            </p>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <a
                href={`/api/tables/${table.id}/qr`}
                download={`${table.label}-qr.png`}
                className="font-medium text-slate-700 hover:text-slate-900"
              >
                PNG
              </a>
              <a
                href={`/api/tables/${table.id}/poster`}
                download={`${table.label}-poster.pdf`}
                className="font-medium text-slate-700 hover:text-slate-900"
              >
                Poster PDF
              </a>
              <button
                onClick={() => deleteTable(table.id)}
                className="font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No tables yet. Add your first table above to generate a QR code.
        </p>
      )}
    </div>
  );
}
