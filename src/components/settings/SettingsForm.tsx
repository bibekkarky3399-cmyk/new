"use client";

import { useState } from "react";

interface RestaurantSettings {
  name: string;
  currency: string;
  taxRateBps: number;
  logoUrl: string;
  primaryColor: string;
  address: string;
  phone: string;
}

export function SettingsForm({
  restaurant,
  canEdit,
}: {
  restaurant: RestaurantSettings;
  canEdit: boolean;
}) {
  const [name, setName] = useState(restaurant.name);
  const [currency, setCurrency] = useState(restaurant.currency);
  const [taxRatePercent, setTaxRatePercent] = useState(
    (restaurant.taxRateBps / 100).toString()
  );
  const [logoUrl, setLogoUrl] = useState(restaurant.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(restaurant.primaryColor);
  const [address, setAddress] = useState(restaurant.address);
  const [phone, setPhone] = useState(restaurant.phone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
          taxRateBps: Math.round(parseFloat(taxRatePercent || "0") * 100),
          logoUrl,
          primaryColor,
          address,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
        return;
      }
      setMessage({ type: "ok", text: "Settings saved." });
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset disabled={!canEdit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Restaurant name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Currency (ISO code)
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tax rate (%)
            </label>
            <input
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Logo URL
          </label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Brand color
          </label>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="mt-1 h-10 w-20 rounded-md border border-slate-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      {!canEdit && (
        <p className="text-sm text-slate-500">
          Only the restaurant owner can edit these settings.
        </p>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.type === "ok" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {canEdit && (
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}
