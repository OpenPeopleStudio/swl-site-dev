import type { MenuBuilderPayload } from "@/types/menu-builder";

export const MENU_BUILDER_SAMPLE: MenuBuilderPayload = {
  concept: {
    id: "concept-prelude-winter-2026",
    name: "Prelude · Winter 2026",
    stage: "testing",
    targetServiceLabel: "Prelude · Jan 12 seating",
    lighthouseNotes:
      "Calm, smoke, and brine. Focus on the North Atlantic pantry and the agency of heat.",
    collaborators: [
      { name: "Ken", role: "Chef", status: "online", lastActive: "2m ago" },
      { name: "Emma", role: "Sous", status: "online", lastActive: "5m ago" },
      { name: "Tom", role: "GM", status: "idle", lastActive: "14m ago" },
      { name: "Mar", role: "Developer", status: "offline", lastActive: "3h ago" },
    ],
  },
  dishes: [
    {
      id: "dish-coal-pearls",
      name: "Coal Pearls",
      category: "Snacks",
      status: "Testing",
      updated_at: "2025-11-20T10:00:00Z",
      targetServings: 36,
    },
    {
      id: "dish-charred-oyster",
      name: "Charred Oyster",
      category: "Cold",
      status: "Trials",
      updated_at: "2025-11-21T03:00:00Z",
      targetServings: 42,
    },
    {
      id: "dish-aged-duck",
      name: "Aged Duck · Alder Smoke",
      category: "Hearth",
      status: "R&D",
      updated_at: "2025-11-19T18:00:00Z",
      targetServings: 24,
    },
  ],
  components: [
    {
      id: "component-ash-sable",
      dish_id: "dish-coal-pearls",
      name: "Ash sable",
      technique: "detrempe",
      estimatedTime: "2h",
    },
    {
      id: "component-hay-yogurt",
      dish_id: "dish-coal-pearls",
      name: "Hay yogurt",
      technique: "ferment",
      estimatedTime: "48h",
    },
    {
      id: "component-cod-tongue",
      dish_id: "dish-charred-oyster",
      name: "Cod tongue brûlée",
      technique: "torch",
      estimatedTime: "1h",
    },
    {
      id: "component-partridgeberry",
      dish_id: "dish-aged-duck",
      name: "Partridgeberry lacquer",
      technique: "reduction",
    },
  ],
  ingredients: [
    {
      id: "ingredient-spruce-tips",
      name: "Spruce tips",
      vendor: "Kovics Foraging",
      unit: "kg",
      cost: 34,
      allergenTags: [],
      source: "Field price list · Nov 2025",
      conversionNote: "1 handful ≈ 18g",
    },
    {
      id: "ingredient-hay",
      name: "Hay",
      vendor: "Killick Farm",
      unit: "kg",
      cost: 7.5,
      allergenTags: ["gluten"],
      source: "Invoice · Nov 14",
    },
    {
      id: "ingredient-cod-tongue",
      name: "Cod tongue",
      vendor: "Petty Harbour coop",
      unit: "kg",
      cost: 26,
      allergenTags: ["seafood"],
      source: "Auction board",
      conversionNote: "One tongue ≈ 22g trimmed",
    },
    {
      id: "ingredient-partridgeberry",
      name: "Partridgeberry",
      vendor: "Labrador Preserve",
      unit: "kg",
      cost: 18.5,
      allergenTags: [],
      source: "Catalogue #2431",
    },
    {
      id: "ingredient-duck",
      name: "Muscovy duck crown",
      vendor: "Fogo Island Farm",
      unit: "kg",
      cost: 21.75,
      allergenTags: [],
      source: "Direct farm contract",
    },
  ],
  costMetrics: [
    { label: "Target price", value: "$38", note: "Prelude tasting format" },
    { label: "Current cost", value: "$11.20", trend: "up" },
    { label: "Food cost %", value: "29%", trend: "flat" },
    { label: "Labour window", value: "32 min", note: "Chef · 18 min, Pastry · 14 min" },
  ],
  allergens: ["Spruce", "Hay (gluten)", "Cod", "Partridgeberry", "Duck"],
  versionHistory: [
    {
      id: "ver-001",
      label: "v1 Coal Pearls",
      date: "Nov 11",
      notes: "Introduced hay yogurt, removed burnt onion ash.",
      deltaCost: "+$0.40",
    },
    {
      id: "ver-002",
      label: "v2 Coal Pearls",
      date: "Nov 16",
      notes: "Added spruce-cod smoke; plating trimmed to two bites.",
      deltaCost: "-$0.25",
    },
  ],
  platingAssets: [
    {
      id: "plating-001",
      photoUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
      annotations: "Coal biscuit base, yogurt quenelle, spruce oil halo.",
    },
    {
      id: "plating-002",
      photoUrl: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=900&q=80",
      annotations: "Reserve plating for oyster course (testing).",
    },
  ],
  chefChat: [
    {
      id: "msg-001",
      author: "Ken",
      content: "Need final price on spruce tips if we triple batch.",
      timestamp: "09:14",
    },
    {
      id: "msg-002",
      author: "Emma",
      content: "Hay yogurt hitting target acidity at 36h—keeping hold 48h for service.",
      timestamp: "09:18",
      outgoing: true,
    },
    {
      id: "msg-003",
      author: "Tom",
      content: "Prelude guests flagged shellfish allergy x2; note for oyster swap.",
      timestamp: "09:22",
    },
  ],
  prepSummary: {
    covers: 38,
    batches: [
      { label: "Ash sable", qty: "2 trays", due: "15:00" },
      { label: "Hay yogurt", qty: "3 gastro", due: "13:30" },
      { label: "Partridgeberry lacquer", qty: "1 pot", due: "16:00" },
    ],
    alerts: ["Cod tongues arrive 11:15", "Hay lot 203 is damp — dry toast before use"],
  },
};


