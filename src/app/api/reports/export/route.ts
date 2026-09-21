import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { parseDateRange } from "@/lib/reports";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const { from, to } = parseDateRange(request.nextUrl.searchParams);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: ctx.restaurant.id,
      createdAt: { gte: from, lt: to },
    },
    include: { items: true, table: { select: { label: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = orders.map((o) => [
    o.createdAt.toISOString(),
    o.id,
    o.table?.label ?? "Takeaway",
    o.customerName ?? "",
    o.status,
    o.items.reduce((sum, i) => sum + i.quantity, 0),
    (o.subtotalCents / 100).toFixed(2),
    (o.taxCents / 100).toFixed(2),
    (o.totalCents / 100).toFixed(2),
  ]);

  const csv = toCsv(
    [
      "Date",
      "Order ID",
      "Table",
      "Customer",
      "Status",
      "Items",
      "Subtotal",
      "Tax",
      "Total",
    ],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
