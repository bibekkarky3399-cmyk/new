import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const categories = await prisma.category.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await prisma.category.count({
    where: { restaurantId: ctx.restaurant.id },
  });

  const category = await prisma.category.create({
    data: {
      restaurantId: ctx.restaurant.id,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? count,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
