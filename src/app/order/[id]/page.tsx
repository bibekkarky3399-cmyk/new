import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderTracker } from "@/components/public/OrderTracker";
import { toOrderDTO } from "@/lib/order-dto";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, table: { select: { label: true } }, restaurant: true },
  });

  if (!order) notFound();

  return (
    <OrderTracker
      orderId={order.id}
      restaurantName={order.restaurant.name}
      currency={order.restaurant.currency}
      initialOrder={toOrderDTO(order)}
    />
  );
}
