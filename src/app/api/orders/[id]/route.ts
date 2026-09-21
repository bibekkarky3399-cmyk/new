import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { orderStatusSchema } from "@/lib/validation";
import { toOrderDTO } from "@/lib/order-dto";

// Order ids are unguessable cuids, so a customer who just placed an order
// can poll this endpoint (their receipt links here) without an account.
// It intentionally returns only order-status information, nothing about
// the wider restaurant.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, table: { select: { label: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ order: toOrderDTO(order) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;
  const { id } = await params;

  const existing = await prisma.order.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { items: true, table: { select: { label: true } } },
  });

  return NextResponse.json({ order: toOrderDTO(order) });
}
