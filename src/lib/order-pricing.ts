export class OrderValidationError extends Error {}

export interface PricingOptionChoice {
  id: string;
  name: string;
  priceDeltaCents: number;
}

export interface PricingOptionGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  choices: PricingOptionChoice[];
}

export interface PricingMenuItem {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  optionGroups: PricingOptionGroup[];
}

export interface RequestedOrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  selectedChoiceIds?: string[];
}

export interface PricedOrderItem {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  selectedOptions: { groupName: string; choiceName: string; priceDeltaCents: number }[];
  lineTotalCents: number;
}

/**
 * Re-derives prices for a set of requested order lines from trusted menu data
 * fetched server-side — never from client-supplied prices. Throws
 * OrderValidationError for anything that doesn't match the current menu
 * (unavailable item, unknown choice, missing required selection, etc).
 */
export function priceOrderItems(
  menuItemsById: Map<string, PricingMenuItem>,
  requested: RequestedOrderItem[]
): PricedOrderItem[] {
  return requested.map((line) => {
    const menuItem = menuItemsById.get(line.menuItemId);
    if (!menuItem) {
      throw new OrderValidationError(`Menu item ${line.menuItemId} not found`);
    }
    if (!menuItem.isAvailable) {
      throw new OrderValidationError(`${menuItem.name} is not currently available`);
    }

    const selectedIds = new Set(line.selectedChoiceIds ?? []);
    const selectedOptions: PricedOrderItem["selectedOptions"] = [];
    let optionsDeltaCents = 0;

    for (const group of menuItem.optionGroups) {
      const chosenInGroup = group.choices.filter((c) => selectedIds.has(c.id));

      if (group.required && chosenInGroup.length === 0) {
        throw new OrderValidationError(
          `"${group.name}" requires a selection for ${menuItem.name}`
        );
      }
      if (!group.multiSelect && chosenInGroup.length > 1) {
        throw new OrderValidationError(
          `"${group.name}" only allows one choice for ${menuItem.name}`
        );
      }

      for (const choice of chosenInGroup) {
        selectedOptions.push({
          groupName: group.name,
          choiceName: choice.name,
          priceDeltaCents: choice.priceDeltaCents,
        });
        optionsDeltaCents += choice.priceDeltaCents;
      }
    }

    // Reject choice ids that don't belong to any option group on this item.
    const validChoiceIds = new Set(
      menuItem.optionGroups.flatMap((g) => g.choices.map((c) => c.id))
    );
    for (const id of selectedIds) {
      if (!validChoiceIds.has(id)) {
        throw new OrderValidationError(
          `Invalid option selected for ${menuItem.name}`
        );
      }
    }

    const unitPriceCents = menuItem.priceCents + optionsDeltaCents;
    const lineTotalCents = unitPriceCents * line.quantity;

    return {
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      unitPriceCents,
      quantity: line.quantity,
      notes: line.notes?.trim() || null,
      selectedOptions,
      lineTotalCents,
    };
  });
}
