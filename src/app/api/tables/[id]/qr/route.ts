import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api-auth";
import { publicMenuUrl } from "@/lib/urls";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, unauthorized } = await requireAuthContext();
  if (!ctx) return unauthorized;
  const { id } = await params;

  const table = await prisma.table.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
  });
  if (!table) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = publicMenuUrl(ctx.restaurant.slug, table.token);
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 800,
    margin: 2,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${table.label.replace(/[^a-z0-9]+/gi, "-")}-qr.png"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
