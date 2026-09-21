import { requireSessionWithUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TableManager } from "@/components/qr/TableManager";

export default async function QrPage() {
  const ctx = await requireSessionWithUser();
  if (!ctx) redirect("/login");

  const tables = await prisma.table.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, token: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">QR Codes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create a QR code for each table. Guests scan it to open your public
        menu and order without logging in.
      </p>
      <div className="mt-6">
        <TableManager initialTables={tables} restaurantSlug={ctx.restaurant.slug} />
      </div>
    </div>
  );
}
