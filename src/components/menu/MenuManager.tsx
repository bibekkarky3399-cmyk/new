"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { CategoryDTO, MenuItemDTO } from "@/lib/types";
import { ItemFormModal } from "@/components/menu/ItemFormModal";

export function MenuManager({
  initialCategories,
  initialMenuItems,
  currency,
}: {
  initialCategories: CategoryDTO[];
  initialMenuItems: MenuItemDTO[];
  currency: string;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialMenuItems);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemDTO | "new" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add category");
      setCategories((prev) => [...prev, data.category]);
      setNewCategoryName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (
      !confirm(
        "Delete this category? Menu items in it will also be deleted."
      )
    )
      return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setItems((prev) => prev.filter((i) => i.categoryId !== id));
    }
  }

  async function toggleAvailability(item: MenuItemDTO) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i
      )
    );
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: item.categoryId,
        name: item.name,
        description: item.description ?? "",
        priceCents: item.priceCents,
        imageUrl: item.imageUrl ?? "",
        isAvailable: !item.isAvailable,
        sortOrder: item.sortOrder,
        optionGroups: item.optionGroups,
      }),
    });
    if (!res.ok) {
      // revert on failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  function onItemSaved(item: MenuItemDTO) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      return exists
        ? prev.map((i) => (i.id === item.id ? item : i))
        : [...prev, item];
    });
    setEditingItem(null);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {c.name}
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Delete ${c.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="New category name"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={addCategory}
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Menu items</h2>
          <button
            onClick={() => setEditingItem("new")}
            disabled={categories.length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            + Add item
          </button>
        </div>
        {categories.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Add a category first to start adding menu items.
          </p>
        )}

        <div className="mt-4 space-y-6">
          {categories.map((category) => {
            const categoryItems = items.filter(
              (i) => i.categoryId === category.id
            );
            if (categoryItems.length === 0) return null;
            return (
              <div key={category.id}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {category.name}
                </h3>
                <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-sm text-slate-500 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatMoney(item.priceCents, currency)}
                      </span>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={() => toggleAvailability(item)}
                        />
                        Available
                      </label>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editingItem && (
        <ItemFormModal
          categories={categories}
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={onItemSaved}
        />
      )}
    </div>
  );
}
