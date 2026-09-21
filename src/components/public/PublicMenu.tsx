"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { ItemDetailModal } from "@/components/public/ItemDetailModal";
import { CartPanel } from "@/components/public/CartPanel";
import type { CartLine, PublicMenuItem } from "@/components/public/types";

interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  currency: string;
  taxRateBps: number;
  logoUrl: string | null;
  primaryColor: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  sortOrder: number;
}

export function PublicMenu({
  restaurant,
  categories,
  menuItems,
  tableToken,
  tableLabel,
}: {
  restaurant: RestaurantInfo;
  categories: CategoryInfo[];
  menuItems: PublicMenuItem[];
  tableToken: string | null;
  tableLabel: string | null;
}) {
  const router = useRouter();
  const storageKey = `qr-menu-cart:${restaurant.slug}:${tableToken ?? "no-table"}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeItem, setActiveItem] = useState<PublicMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Cart is persisted per-device in localStorage, which only exists
    // client-side, so it must be loaded after mount rather than during the
    // (possibly server-rendered) initial render.
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore corrupt local storage
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // ignore quota errors
    }
  }, [cart, storageKey, hydrated]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, PublicMenuItem[]>();
    for (const item of menuItems) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [menuItems]);

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotalCents = cart.reduce(
    (sum, l) => sum + l.unitPriceCents * l.quantity,
    0
  );

  function addToCart(line: CartLine) {
    setCart((prev) => {
      const existing = prev.find((l) => l.key === line.key);
      if (existing) {
        return prev.map((l) =>
          l.key === line.key
            ? { ...l, quantity: l.quantity + line.quantity }
            : l
        );
      }
      return [...prev, line];
    });
    setActiveItem(null);
    setCartOpen(true);
  }

  function updateQuantity(key: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity } : l))
    );
  }

  async function checkout(customerName: string, notes: string) {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantSlug: restaurant.slug,
        tableToken: tableToken ?? undefined,
        customerName,
        notes,
        items: cart.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          notes: l.notes,
          selectedChoiceIds: l.selectedOptions.map((o) => o.choiceId),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not place order");
    }
    setCart([]);
    window.localStorage.removeItem(storageKey);
    router.push(`/order/${data.order.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header
        className="px-6 py-8 text-white"
        style={{ backgroundColor: restaurant.primaryColor }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {tableLabel && (
            <p className="mt-1 text-sm text-white/80">Ordering for {tableLabel}</p>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4">
        {categories.length === 0 && (
          <p className="mt-8 text-center text-slate-500">
            This menu isn&apos;t available yet. Please check back soon.
          </p>
        )}

        {categories.map((category) => {
          const items = itemsByCategory.get(category.id) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={category.id} className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">
                {category.name}
              </h2>
              <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.isAvailable && setActiveItem(item)}
                    disabled={!item.isAvailable}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left disabled:opacity-50"
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">
                        {item.name}
                        {!item.isAvailable && (
                          <span className="ml-2 text-xs font-normal text-red-500">
                            Sold out
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatMoney(item.priceCents, restaurant.currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {activeItem && (
        <ItemDetailModal
          item={activeItem}
          currency={restaurant.currency}
          onClose={() => setActiveItem(null)}
          onAdd={addToCart}
        />
      )}

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 mx-auto max-w-3xl rounded-xl bg-slate-900 px-5 py-4 text-white shadow-lg flex items-center justify-between"
        >
          <span className="font-semibold">
            {cartCount} item{cartCount > 1 ? "s" : ""} in cart
          </span>
          <span className="font-semibold">
            {formatMoney(cartTotalCents, restaurant.currency)}
          </span>
        </button>
      )}

      {cartOpen && (
        <CartPanel
          cart={cart}
          currency={restaurant.currency}
          taxRateBps={restaurant.taxRateBps}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateQuantity}
          onCheckout={checkout}
        />
      )}
    </main>
  );
}
