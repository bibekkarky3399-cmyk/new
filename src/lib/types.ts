export interface CategoryDTO {
  id: string;
  name: string;
  sortOrder: number;
}

export interface OptionChoiceDTO {
  id?: string;
  name: string;
  priceDeltaCents: number;
  sortOrder?: number;
}

export interface OptionGroupDTO {
  id?: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  sortOrder?: number;
  choices: OptionChoiceDTO[];
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  optionGroups: OptionGroupDTO[];
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export interface OrderItemDTO {
  id: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  selectedOptions: { groupName: string; choiceName: string; priceDeltaCents: number }[] | null;
}

export interface OrderDTO {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  tableLabel: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDTO[];
}
