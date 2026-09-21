import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { tableSchema } from "@/lib/validation";

export async function GET() {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const tables = await prisma.table.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ tables });
}

export async function POST(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const table = await prisma.table.create({
    data: { restaurantId: ctx.restaurant.id, label: parsed.data.label },
  });

  return NextResponse.json({ table }, { status: 201 });
}
