import type { OrderDTO, OrderStatus } from "@/lib/types";

interface RawOrder {
  id: string;
  status: string;
  customerName: string | null;
  notes: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  table: { label: string } | null;
  items: {
    id: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    selectedOptions: unknown;
  }[];
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function toOrderDTO(order: RawOrder): OrderDTO {
  return {
    id: order.id,
    status: order.status as OrderStatus,
    customerName: order.customerName,
    tableLabel: order.table?.label ?? null,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    notes: order.notes,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    items: order.items.map((i) => ({
      id: i.id,
      nameSnapshot: i.nameSnapshot,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      notes: i.notes,
      selectedOptions:
        (i.selectedOptions as OrderDTO["items"][number]["selectedOptions"]) ??
        null,
    })),
  };
}
