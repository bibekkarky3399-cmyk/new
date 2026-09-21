export interface PublicOptionChoice {
  id: string;
  name: string;
  priceDeltaCents: number;
  sortOrder: number;
}

export interface PublicOptionGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  sortOrder: number;
  choices: PublicOptionChoice[];
}

export interface PublicMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  optionGroups: PublicOptionGroup[];
}

export interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  selectedOptions: {
    groupId: string;
    groupName: string;
    choiceId: string;
    choiceName: string;
    priceDeltaCents: number;
  }[];
}
