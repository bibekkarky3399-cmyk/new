"use client";

import { useState } from "react";
import type { CategoryDTO, MenuItemDTO, OptionGroupDTO } from "@/lib/types";

function emptyGroup(): OptionGroupDTO {
  return { name: "", required: false, multiSelect: false, choices: [] };
}

export function ItemFormModal({
  categories,
  item,
  onClose,
  onSaved,
}: {
  categories: CategoryDTO[];
  item: MenuItemDTO | null;
  onClose: () => void;
  onSaved: (item: MenuItemDTO) => void;
}) {
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories[0]?.id ?? ""
  );
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(
    item ? (item.priceCents / 100).toFixed(2) : ""
  );
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [optionGroups, setOptionGroups] = useState<OptionGroupDTO[]>(
    item?.optionGroups ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateGroup(index: number, patch: Partial<OptionGroupDTO>) {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  }

  function addChoice(groupIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              choices: [
                ...g.choices,
                { name: "", priceDeltaCents: 0 },
              ],
            }
          : g
      )
    );
  }

  function updateChoice(
    groupIndex: number,
    choiceIndex: number,
    patch: Partial<{ name: string; priceDeltaCents: number }>
  ) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              choices: g.choices.map((c, ci) =>
                ci === choiceIndex ? { ...c, ...patch } : c
              ),
            }
          : g
      )
    );
  }

  function removeChoice(groupIndex: number, choiceIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, choices: g.choices.filter((_, ci) => ci !== choiceIndex) }
          : g
      )
    );
  }

  function removeGroup(index: number) {
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit() {
    setError(null);
    const priceCents = Math.round(parseFloat(price || "0") * 100);
    if (!name.trim() || !categoryId || Number.isNaN(priceCents)) {
      setError("Name, category, and a valid price are required.");
      return;
    }
    const cleanedGroups = optionGroups
      .filter((g) => g.name.trim() && g.choices.length > 0)
      .map((g) => ({
        ...g,
        choices: g.choices.filter((c) => c.name.trim()),
      }));

    setSaving(true);
    try {
      const url = item ? `/api/menu-items/${item.id}` : "/api/menu-items";
      const res = await fetch(url, {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          name: name.trim(),
          description: description.trim(),
          priceCents,
          imageUrl: imageUrl.trim(),
          isAvailable: item?.isAvailable ?? true,
          sortOrder: item?.sortOrder,
          optionGroups: cleanedGroups,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save item");
        return;
      }
      onSaved(data.menuItem);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">
          {item ? "Edit item" : "Add item"}
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Price
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="9.99"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Image URL
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Customization options
              </label>
              <button
                type="button"
                onClick={() =>
                  setOptionGroups((prev) => [...prev, emptyGroup()])
                }
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                + Add group
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {optionGroups.map((group, gi) => (
                <div
                  key={gi}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex gap-2">
                    <input
                      value={group.name}
                      onChange={(e) =>
                        updateGroup(gi, { name: e.target.value })
                      }
                      placeholder="e.g. Size"
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(gi)}
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) =>
                          updateGroup(gi, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={group.multiSelect}
                        onChange={(e) =>
                          updateGroup(gi, { multiSelect: e.target.checked })
                        }
                      />
                      Multiple choices
                    </label>
                  </div>
                  <div className="mt-2 space-y-1">
                    {group.choices.map((choice, ci) => (
                      <div key={ci} className="flex gap-2">
                        <input
                          value={choice.name}
                          onChange={(e) =>
                            updateChoice(gi, ci, { name: e.target.value })
                          }
                          placeholder="Choice name"
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <input
                          value={(choice.priceDeltaCents / 100).toString()}
                          onChange={(e) =>
                            updateChoice(gi, ci, {
                              priceDeltaCents: Math.round(
                                parseFloat(e.target.value || "0") * 100
                              ),
                            })
                          }
                          inputMode="decimal"
                          placeholder="+0.00"
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeChoice(gi, ci)}
                          className="text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addChoice(gi)}
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      + Add choice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
