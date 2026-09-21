import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;
  const { id } = await params;

  const existing = await prisma.table.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.table.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
