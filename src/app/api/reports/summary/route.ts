import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { parseDateRange } from "@/lib/reports";

export async function GET(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const { from, to } = parseDateRange(request.nextUrl.searchParams);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: ctx.restaurant.id,
      status: { not: "CANCELLED" },
      createdAt: { gte: from, lt: to },
    },
    include: { items: true },
  });

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const avgOrderCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const itemStats = new Map<string, { quantity: number; revenueCents: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const stat = itemStats.get(item.nameSnapshot) ?? { quantity: 0, revenueCents: 0 };
      stat.quantity += item.quantity;
      stat.revenueCents += item.unitPriceCents * item.quantity;
      itemStats.set(item.nameSnapshot, stat);
    }
  }
  const topItems = [...itemStats.entries()]
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);

  const byDayMap = new Map<string, { revenueCents: number; orders: number }>();
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    const entry = byDayMap.get(day) ?? { revenueCents: 0, orders: 0 };
    entry.revenueCents += order.totalCents;
    entry.orders += 1;
    byDayMap.set(day, entry);
  }
  const byDay = [...byDayMap.entries()]
    .map(([date, stat]) => ({ date, ...stat }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    totalOrders,
    totalRevenueCents,
    avgOrderCents,
    topItems,
    byDay,
  });
}
