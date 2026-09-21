"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { CartLine, PublicMenuItem } from "@/components/public/types";

export function ItemDetailModal({
  item,
  currency,
  onClose,
  onAdd,
}: {
  item: PublicMenuItem;
  currency: string;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>(
    {}
  );
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleChoice(groupId: string, choiceId: string, multiSelect: boolean) {
    setSelections((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (multiSelect) {
        current.has(choiceId) ? current.delete(choiceId) : current.add(choiceId);
      } else {
        current.clear();
        current.add(choiceId);
      }
      return { ...prev, [groupId]: current };
    });
  }

  const selectedOptions = useMemo(() => {
    const result: CartLine["selectedOptions"] = [];
    for (const group of item.optionGroups) {
      const chosen = selections[group.id] ?? new Set<string>();
      for (const choice of group.choices) {
        if (chosen.has(choice.id)) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: choice.id,
            choiceName: choice.name,
            priceDeltaCents: choice.priceDeltaCents,
          });
        }
      }
    }
    return result;
  }, [selections, item.optionGroups]);

  const unitPriceCents =
    item.priceCents +
    selectedOptions.reduce((sum, o) => sum + o.priceDeltaCents, 0);

  function handleAdd() {
    for (const group of item.optionGroups) {
      if (group.required && (selections[group.id]?.size ?? 0) === 0) {
        setError(`Please select an option for "${group.name}"`);
        return;
      }
    }
    const key = `${item.id}:${selectedOptions
      .map((o) => o.choiceId)
      .sort()
      .join(",")}`;
    onAdd({
      key,
      menuItemId: item.id,
      name: item.name,
      unitPriceCents,
      quantity,
      notes: notes.trim(),
      selectedOptions,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="mt-2 font-semibold text-slate-900">
          {formatMoney(item.priceCents, currency)}
        </p>

        <div className="mt-4 space-y-4">
          {item.optionGroups.map((group) => (
            <div key={group.id}>
              <p className="text-sm font-semibold text-slate-800">
                {group.name}
                {group.required && (
                  <span className="ml-1 text-xs font-normal text-red-500">
                    Required
                  </span>
                )}
              </p>
              <div className="mt-2 space-y-1.5">
                {group.choices.map((choice) => {
                  const checked = selections[group.id]?.has(choice.id) ?? false;
                  return (
                    <label
                      key={choice.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type={group.multiSelect ? "checkbox" : "radio"}
                          name={group.id}
                          checked={checked}
                          onChange={() =>
                            toggleChoice(group.id, choice.id, group.multiSelect)
                          }
                        />
                        {choice.name}
                      </span>
                      {choice.priceDeltaCents !== 0 && (
                        <span className="text-slate-500">
                          {choice.priceDeltaCents > 0 ? "+" : ""}
                          {formatMoney(choice.priceDeltaCents, currency)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="text-sm font-semibold text-slate-800">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. no onions"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center gap-4">
          <div className="flex items-center rounded-md border border-slate-300">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="px-3 py-2 text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex-1 rounded-md bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Add — {formatMoney(unitPriceCents * quantity, currency)}
          </button>
        </div>
      </div>
    </div>
  );
}
