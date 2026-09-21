import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  return NextResponse.json({ restaurant, categories, menuItems });
}
