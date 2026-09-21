import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  return NextResponse.json({ restaurant: ctx.restaurant });
}

export async function PATCH(request: NextRequest) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;

  if (ctx.session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the owner can change restaurant settings" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const restaurant = await prisma.restaurant.update({
    where: { id: ctx.restaurant.id },
    data: {
      name: data.name,
      currency: data.currency.toUpperCase(),
      taxRateBps: data.taxRateBps,
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor,
      address: data.address || null,
      phone: data.phone || null,
    },
  });

  return NextResponse.json({ restaurant });
}
