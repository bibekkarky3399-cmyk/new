import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { menuItemSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;
  const { id } = await params;

  const existing = await prisma.menuItem.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  // Replace option groups/choices wholesale — simplest correct approach for
  // a menu editor where groups are small in number.
  const menuItem = await prisma.$transaction(async (tx) => {
    await tx.optionGroup.deleteMany({ where: { menuItemId: id } });
    return tx.menuItem.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description || null,
        priceCents: data.priceCents,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
        sortOrder: data.sortOrder ?? existing.sortOrder,
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
  });

  return NextResponse.json({ menuItem });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;
  const { id } = await params;

  const existing = await prisma.menuItem.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
