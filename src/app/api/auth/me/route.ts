import { NextResponse } from "next/server";
import { requireSessionWithUser } from "@/lib/session";

export async function GET() {
  const ctx = await requireSessionWithUser();
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, restaurant } = ctx;
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
  });
}
