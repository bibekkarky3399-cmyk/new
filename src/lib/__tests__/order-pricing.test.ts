import { describe, expect, it } from "vitest";
import {
  OrderValidationError,
  priceOrderItems,
  type PricingMenuItem,
} from "@/lib/order-pricing";

const burger: PricingMenuItem = {
  id: "item_burger",
  name: "Burger",
  priceCents: 1000,
  isAvailable: true,
  optionGroups: [
    {
      id: "group_size",
      name: "Size",
      required: true,
      multiSelect: false,
      choices: [
        { id: "choice_regular", name: "Regular", priceDeltaCents: 0 },
        { id: "choice_large", name: "Large", priceDeltaCents: 200 },
      ],
    },
    {
      id: "group_addons",
      name: "Add-ons",
      required: false,
      multiSelect: true,
      choices: [
        { id: "choice_cheese", name: "Cheese", priceDeltaCents: 100 },
        { id: "choice_bacon", name: "Bacon", priceDeltaCents: 150 },
      ],
    },
  ],
};

const soldOutFries: PricingMenuItem = {
  id: "item_fries",
  name: "Fries",
  priceCents: 400,
  isAvailable: false,
  optionGroups: [],
};

function menuMap(...items: PricingMenuItem[]) {
  return new Map(items.map((i) => [i.id, i]));
}

describe("priceOrderItems", () => {
  it("prices a plain item with no options", () => {
    const line = priceOrderItems(menuMap(burger), [
      { menuItemId: burger.id, quantity: 1, selectedChoiceIds: ["choice_regular"] },
    ])[0]!;
    expect(line.unitPriceCents).toBe(1000);
    expect(line.lineTotalCents).toBe(1000);
  });

  it("adds option deltas and multiplies by quantity", () => {
    const line = priceOrderItems(menuMap(burger), [
      {
        menuItemId: burger.id,
        quantity: 2,
        selectedChoiceIds: ["choice_large", "choice_cheese", "choice_bacon"],
      },
    ])[0]!;
    // 1000 + 200 (large) + 100 (cheese) + 150 (bacon) = 1450 per unit
    expect(line.unitPriceCents).toBe(1450);
    expect(line.lineTotalCents).toBe(2900);
    expect(line.selectedOptions).toHaveLength(3);
  });

  it("rejects an unknown menu item id", () => {
    expect(() =>
      priceOrderItems(menuMap(burger), [
        { menuItemId: "does-not-exist", quantity: 1 },
      ])
    ).toThrow(OrderValidationError);
  });

  it("rejects an item that is no longer available", () => {
    expect(() =>
      priceOrderItems(menuMap(soldOutFries), [
        { menuItemId: soldOutFries.id, quantity: 1 },
      ])
    ).toThrow(/not currently available/);
  });

  it("rejects a missing required option group", () => {
    expect(() =>
      priceOrderItems(menuMap(burger), [
        { menuItemId: burger.id, quantity: 1, selectedChoiceIds: [] },
      ])
    ).toThrow(/requires a selection/);
  });

  it("rejects more than one choice in a single-select group", () => {
    expect(() =>
      priceOrderItems(menuMap(burger), [
        {
          menuItemId: burger.id,
          quantity: 1,
          selectedChoiceIds: ["choice_regular", "choice_large"],
        },
      ])
    ).toThrow(/only allows one choice/);
  });

  it("rejects a choice id that doesn't belong to the item", () => {
    expect(() =>
      priceOrderItems(menuMap(burger), [
        {
          menuItemId: burger.id,
          quantity: 1,
          selectedChoiceIds: ["choice_regular", "not-a-real-choice"],
        },
      ])
    ).toThrow(/Invalid option/);
  });

  it("never trusts a client-supplied price — only server-side menu data feeds the total", () => {
    const line = priceOrderItems(menuMap(burger), [
      {
        // @ts-expect-error - simulating a malicious payload with an injected price field
        priceCents: 1,
        menuItemId: burger.id,
        quantity: 1,
        selectedChoiceIds: ["choice_regular"],
      },
    ])[0]!;
    expect(line.unitPriceCents).toBe(1000);
  });
});
