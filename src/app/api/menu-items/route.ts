import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { menuItemSchema } from "@/lib/validation";

export async function GET() {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId: ctx.restaurant.id },
    include: {
      optionGroups: { include: { choices: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ menuItems });
}

export async function POST(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, restaurantId: ctx.restaurant.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const count = await prisma.menuItem.count({
    where: { restaurantId: ctx.restaurant.id },
  });

  const menuItem = await prisma.menuItem.create({
    data: {
      restaurantId: ctx.restaurant.id,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description || null,
      priceCents: data.priceCents,
      imageUrl: data.imageUrl || null,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? count,
      optionGroups: {
        create: (data.optionGroups ?? []).map((group, gi) => ({
          name: group.name,
          required: group.required ?? false,
          multiSelect: group.multiSelect ?? false,
          sortOrder: group.sortOrder ?? gi,
          choices: {
            create: group.choices.map((choice, ci) => ({
              name: choice.name,
              priceDeltaCents: choice.priceDeltaCents,
              sortOrder: choice.sortOrder ?? ci,
            })),
          },
        })),
      },
    },
    include: { optionGroups: { include: { choices: true } } },
  });

  return NextResponse.json({ menuItem }, { status: 201 });
}
