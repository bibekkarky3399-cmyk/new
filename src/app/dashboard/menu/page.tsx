import { requireSessionWithUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuManager } from "@/components/menu/MenuManager";

export default async function MenuPage() {
  const ctx = await requireSessionWithUser();
  if (!ctx) redirect("/login");

  const [categories, menuItems] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: ctx.restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: ctx.restaurant.id },
      include: {
        optionGroups: {
          include: { choices: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Menu</h1>
      <p className="mt-1 text-sm text-slate-500">
        Changes here go live on your public menu instantly.
      </p>
      <div className="mt-6">
        <MenuManager
          initialCategories={categories}
          initialMenuItems={JSON.parse(JSON.stringify(menuItems))}
          currency={ctx.restaurant.currency}
        />
      </div>
    </div>
  );
}
