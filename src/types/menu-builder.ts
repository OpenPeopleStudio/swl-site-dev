export type DishStatus = "R&D" | "Testing" | "Trials" | "Live" | "Retired";

export type DishSummary = {
  id: string;
  name: string;
  category: string;
  status: DishStatus;
  updated_at: string;
  targetServings?: number;
};

export type ComponentDraft = {
  id: string;
  dish_id: string;
  name: string;
  technique: string;
  estimatedTime?: string;
};

export type IngredientRecord = {
  id: string;
  name: string;
  vendor?: string | null;
  unit?: string;
  cost?: number | null;
  aiEstimate?: number | null;
  allergenTags?: string[];
  source?: string;
  conversionNote?: string;
};

export type CostMetric = {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  note?: string;
};

export type VersionEntry = {
  id: string;
  label: string;
  date: string;
  notes: string;
  deltaCost?: string;
};

export type PlatingAsset = {
  id: string;
  photoUrl: string;
  annotations?: string;
};

export type ChefMessage = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  outgoing?: boolean;
};

export type PrepBatch = {
  label: string;
  qty: string;
  due: string;
};

export type PrepSummary = {
  covers: number;
  batches: PrepBatch[];
  alerts: string[];
};

export type MenuCollaborator = {
  name: string;
  role: string;
  status: "online" | "idle" | "offline";
  lastActive: string;
};

export type MenuConceptSummary = {
  id: string;
  name: string;
  stage: "ideation" | "testing" | "service";
  targetServiceLabel: string;
  lighthouseNotes: string;
  collaborators: MenuCollaborator[];
};

export type MenuBuilderPayload = {
  concept: MenuConceptSummary;
  dishes: DishSummary[];
  components: ComponentDraft[];
  ingredients: IngredientRecord[];
  costMetrics: CostMetric[];
  allergens: string[];
  versionHistory: VersionEntry[];
  platingAssets: PlatingAsset[];
  chefChat: ChefMessage[];
  prepSummary: PrepSummary;
};


