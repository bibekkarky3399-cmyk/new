import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicMenu } from "@/components/public/PublicMenu";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t: tableToken } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      taxRateBps: true,
      logoUrl: true,
      primaryColor: true,
    },
  });

  if (!restaurant) notFound();

  let tableLabel: string | null = null;
  if (tableToken) {
    const table = await prisma.table.findFirst({
      where: { token: tableToken, restaurantId: restaurant.id },
      select: { label: true },
    });
    tableLabel = table?.label ?? null;
  }

  const [categories, menuItems] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { choices: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
  ]);

  return (
    <PublicMenu
      restaurant={restaurant}
      categories={categories}
      menuItems={JSON.parse(JSON.stringify(menuItems))}
      tableToken={tableToken ?? null}
      tableLabel={tableLabel}
    />
  );
}
