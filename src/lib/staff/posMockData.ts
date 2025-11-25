import type { MenuCategory, ModifierSuggestion, TableBlock } from "@/types/pos";

export function createDiningTables(): TableBlock[] {
  return Array.from({ length: 14 }).map((_, index) => ({
    id: `d-${String(index + 1).padStart(2, "0")}`,
    label: `Dining ${String(index + 1).padStart(2, "0")}`,
    seats: 2,
    zone: "dining",
    canCombine: true,
    status: (["ordering", "open", "served", "paying"][index % 4] ?? "open") as TableBlock["status"],
    currentCourse: ["Prelude", "Course II", "Course III", "Dessert"][index % 4],
    lastOrderMinutes: (index % 5) * 7 + 5,
    seatedMinutes: (index % 6) * 12 + 20,
    guestNames: index % 3 === 0 ? ["Aya", "Ken"] : ["Guest"],
    billTotal: 240 + index * 8,
  }));
}

export function createChefTables(): TableBlock[] {
  return Array.from({ length: 4 }).map((_, index) => ({
    id: `chef-${index + 1}`,
    label: `Chef ${index + 1}`,
    seats: 1,
    zone: "chef",
    canCombine: false,
    status: index % 2 === 0 ? "ordering" : "served",
    currentCourse: index % 2 === 0 ? "Chef's Notes" : "Prelude",
    lastOrderMinutes: 4 + index * 3,
    seatedMinutes: 18 + index * 6,
    guestNames: [`Chef's Guest ${index + 1}`],
    billTotal: 180 + index * 20,
  }));
}

export function createBarSeats(): TableBlock[] {
  return Array.from({ length: 4 }).map((_, index) => ({
    id: `bar-${index + 1}`,
    label: `Bar ${index + 1}`,
    seats: 1,
    zone: "bar",
    canCombine: false,
    status: "open",
    currentCourse: "Snacks",
    lastOrderMinutes: 0,
    seatedMinutes: 0,
    guestNames: [],
    billTotal: 0,
  }));
}

export function createMenuCatalog(): MenuCategory[] {
  return [
    {
      id: "snacks",
      label: "Snacks",
      color: "#00FF9C",
      items: [
        { id: "snack-1", name: "Shiso Spritz", price: 18, tags: ["bev"], modifierKey: "shiso" },
        { id: "snack-2", name: "Sea Lettuce Chip", price: 12, modifierKey: "chip" },
        { id: "snack-3", name: "Coal Pearls", price: 15 },
      ],
    },
    {
      id: "plates",
      label: "Plates",
      color: "#8A7CFF",
      items: [
        { id: "main-1", name: "Charred Oyster", price: 28, modifierKey: "oyster" },
        { id: "main-2", name: "Ember Beet", price: 24 },
        { id: "main-3", name: "River Trout", price: 34 },
        { id: "main-4", name: "Aged Duck", price: 42, modifierKey: "duck" },
      ],
    },
    {
      id: "desserts",
      label: "Desserts",
      color: "#FF82E0",
      items: [
        { id: "dessert-1", name: "Black Sesame Cloud", price: 16 },
        { id: "dessert-2", name: "Frozen Yuzu Leaf", price: 14 },
      ],
    },
    {
      id: "pairings",
      label: "Pairings",
      color: "#42D9FF",
      items: [
        { id: "pair-1", name: "Wine Pairing", price: 68 },
        { id: "pair-2", name: "NA Pairing", price: 48 },
      ],
    },
  ];
}

export function createModifierLibrary(): Record<string, ModifierSuggestion[]> {
  return {
    shiso: [
      { id: "zero-proof", label: "Zero-proof version" },
      { id: "less-sweet", label: "Less sweet" },
    ],
    chip: [
      { id: "no-sesame", label: "No sesame" },
      { id: "extra-crisp", label: "Extra crisp" },
    ],
    oyster: [
      { id: "allium-free", label: "Remove allium" },
      { id: "extra-caviar", label: "Extra caviar" },
    ],
    duck: [
      { id: "medium-rare", label: "Cook medium rare", defaultApplied: true },
      { id: "sauce-side", label: "Sauce on the side" },
    ],
  };
}

