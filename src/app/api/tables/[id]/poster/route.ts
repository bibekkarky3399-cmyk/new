import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  const qrPngBytes = await QRCode.toBuffer(url, { type: "png", width: 1000, margin: 1 });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 595]); // A5 portrait, points
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdfDoc.embedPng(qrPngBytes);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1),
  });

  const restaurantName = ctx.restaurant.name;
  const titleSize = restaurantName.length > 26 ? 18 : 22;
  page.drawText(restaurantName, {
    x: 30,
    y: height - 60,
    size: titleSize,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
    maxWidth: width - 60,
  });

  page.drawText("Scan to view our menu & order", {
    x: 30,
    y: height - 85,
    size: 12,
    font,
    color: rgb(0.35, 0.39, 0.46),
  });

  const qrSize = 300;
  page.drawImage(qrImage, {
    x: (width - qrSize) / 2,
    y: height - 110 - qrSize,
    width: qrSize,
    height: qrSize,
  });

  const tableLabelSize = 20;
  const tableLabelWidth = fontBold.widthOfTextAtSize(table.label, tableLabelSize);
  page.drawText(table.label, {
    x: (width - tableLabelWidth) / 2,
    y: height - 150 - qrSize,
    size: tableLabelSize,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("No app needed — scan with your phone camera", {
    x: 30,
    y: 36,
    size: 10,
    font,
    color: rgb(0.55, 0.59, 0.65),
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${table.label.replace(/[^a-z0-9]+/gi, "-")}-poster.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
