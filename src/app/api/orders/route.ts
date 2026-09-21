import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { createOrderSchema } from "@/lib/validation";
import {
  OrderValidationError,
  priceOrderItems,
  type PricingMenuItem,
} from "@/lib/order-pricing";
import { computeOrderTotals } from "@/lib/money";
import { toOrderDTO } from "@/lib/order-dto";

export async function GET(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const status = request.nextUrl.searchParams.get("status");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 100, 1), 500);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: ctx.restaurant.id,
      ...(status ? { status: status as never } : {}),
    },
    include: { items: true, table: { select: { label: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ orders: orders.map(toOrderDTO) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: data.restaurantSlug },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  let tableId: string | null = null;
  if (data.tableToken) {
    const table = await prisma.table.findFirst({
      where: { token: data.tableToken, restaurantId: restaurant.id },
    });
    if (!table) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }
    tableId = table.id;
  }

  const menuItemIds = [...new Set(data.items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId: restaurant.id },
    include: { optionGroups: { include: { choices: true } } },
  });
  const menuItemsById = new Map<string, PricingMenuItem>(
    menuItems.map((mi) => [mi.id, mi])
  );

  let pricedLines;
  try {
    pricedLines = priceOrderItems(menuItemsById, data.items);
  } catch (e) {
    if (e instanceof OrderValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const { subtotalCents, taxCents, totalCents } = computeOrderTotals(
    pricedLines.map((l) => l.lineTotalCents),
    restaurant.taxRateBps
  );

  const order = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId,
      customerName: data.customerName || null,
      notes: data.notes || null,
      subtotalCents,
      taxCents,
      totalCents,
      items: {
        create: pricedLines.map((l) => ({
          menuItemId: l.menuItemId,
          nameSnapshot: l.nameSnapshot,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          notes: l.notes,
          selectedOptions: l.selectedOptions,
        })),
      },
    },
    include: { items: true, table: { select: { label: true } } },
  });

  return NextResponse.json({ order: toOrderDTO(order) }, { status: 201 });
}
