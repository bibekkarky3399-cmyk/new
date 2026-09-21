import { requireSessionWithUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrdersBoard } from "@/components/orders/OrdersBoard";
import { toOrderDTO } from "@/lib/order-dto";

export default async function OrdersPage() {
  const ctx = await requireSessionWithUser();
  if (!ctx) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { restaurantId: ctx.restaurant.id },
    include: { items: true, table: { select: { label: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
      <p className="mt-1 text-sm text-slate-500">
        Live orders update automatically. Move an order forward as you work
        on it.
      </p>
      <div className="mt-6">
        <OrdersBoard
          initialOrders={orders.map(toOrderDTO)}
          currency={ctx.restaurant.currency}
        />
      </div>
    </div>
  );
}
