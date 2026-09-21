import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "restaurant"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { restaurantName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const baseSlug = slugify(restaurantName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const passwordHash = await hashPassword(password);

  const { user, restaurant } = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: { name: restaurantName, slug },
    });
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "OWNER",
        restaurantId: restaurant.id,
      },
    });
    return { user, restaurant };
  });

  const token = signSession({
    userId: user.id,
    restaurantId: restaurant.id,
    role: user.role,
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
