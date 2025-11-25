import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  InventoryCountSessionSummary,
  InventoryGridItem,
  InventoryItemType,
  InventorySnapshot,
} from "@/types/inventory";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const inventoryAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: {
        headers: {
          "X-Client-Info": "inventory-admin",
        },
      },
    })
  : null;

function requireInventoryAdmin() {
  if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!inventoryAdmin) throw new Error("Inventory admin client not initialized");
  return inventoryAdmin;
}

export type FoodInventoryItem = {
  id: string;
  name: string;
  category?: string | null;
  storage_zone?: string | null;
  unit_type?: string | null;
  on_hand_quantity?: number | null;
  par_level?: number | null;
  minimum_threshold?: number | null;
  vendor_id?: string | null;
  cost_per_unit?: number | null;
  last_invoice_cost?: number | null;
  updated_at?: string | null;
};

export type AlcoholInventoryItem = {
  id: string;
  name: string;
  category?: string | null;
  storage_zone?: string | null;
  bottle_count?: number | null;
  open_bottle_volume?: number | null;
  par_level?: number | null;
  minimum_threshold?: number | null;
  vendor_id?: string | null;
  cost_per_bottle?: number | null;
  updated_at?: string | null;
};

export type VendorProfile = {
  id: string;
  name: string;
  punctuality_rating?: number | null;
  cost_drift_percent?: number | null;
  weekend_reliability?: number | null;
  notes?: string | null;
};

type InventoryCountSessionRow = {
  id: string;
  label?: string | null;
  started_at?: string | null;
  focus_zone?: string | null;
  counted_items?: Array<{ item_id: string } | null> | null;
  status?: string | null;
};

export const listFoodInventory = cache(async (limit = 50) => {
  const supabase = requireInventoryAdmin();
  const { data, error } = await supabase
    .from("food_inventory_items")
    .select(
      "id, name, category, storage_zone, on_hand_quantity, par_level, minimum_threshold, vendor_id, cost_per_unit, last_invoice_cost, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table may not exist yet - return empty array to allow build
    console.error("listFoodInventory error", error);
    return [] as FoodInventoryItem[];
  }
  return (data ?? []) as FoodInventoryItem[];
});

export const listAlcoholInventory = cache(async (limit = 50) => {
  const supabase = requireInventoryAdmin();
  const { data, error } = await supabase
    .from("alcohol_inventory_items")
    .select(
      "id, name, category, storage_zone, bottle_count, open_bottle_volume, par_level, minimum_threshold, vendor_id, cost_per_bottle, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table may not exist yet - return empty array to allow build
    console.error("listAlcoholInventory error", error);
    return [] as AlcoholInventoryItem[];
  }
  return (data ?? []) as AlcoholInventoryItem[];
});

export const listVendorProfiles = cache(async (limit = 20) => {
  const supabase = requireInventoryAdmin();
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select(
      "id, name, punctuality_rating, cost_drift_percent, weekend_reliability, notes",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table may not exist yet - return empty array to allow build
    console.error("listVendorProfiles error", error);
    return [] as VendorProfile[];
  }
  return (data ?? []) as VendorProfile[];
});

export const listInventoryNotes = cache(async (limit = 10) => {
  const supabase = requireInventoryAdmin();
  const { data, error } = await supabase
    .from("inventory_notes")
    .select(
      "id, note, created_at, tags, author_id, related_module",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table may not exist yet - return empty array to allow build
    console.error("listInventoryNotes error", error);
    return [];
  }
  return data ?? [];
});

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

type VendorJoin =
  | {
      id?: string;
      name?: string | null;
      punctuality_rating?: number | null;
      cost_drift_percent?: number | null;
    }
  | null;

type FoodInventoryRow = FoodInventoryItem & {
  vendor?: VendorJoin;
};

type AlcoholInventoryRow = AlcoholInventoryItem & {
  vendor?: VendorJoin;
};

export type InventorySnapshotOptions = {
  includeAlcohol?: boolean;
  limit?: number;
};

export async function fetchInventorySnapshot(options: InventorySnapshotOptions = {}): Promise<InventorySnapshot> {
  const supabase = requireInventoryAdmin();
  const includeAlcohol = options.includeAlcohol ?? true;
  const limit = options.limit ?? 200;

  const foodPromise = supabase
    .from("food_inventory_items")
    .select(
      [
        "id",
        "name",
        "category",
        "storage_zone",
        "unit_type",
        "on_hand_quantity",
        "par_level",
        "minimum_threshold",
        "vendor_id",
        "last_counted_at",
        "updated_at",
        "vendor:vendor_profiles(id,name)",
      ].join(","),
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  const alcoholPromise = includeAlcohol
    ? supabase
        .from("alcohol_inventory_items")
        .select(
          [
            "id",
            "name",
            "category",
            "storage_zone",
            "unit_size",
            "bottle_count",
            "par_level",
            "minimum_threshold",
            "vendor_id",
            "updated_at",
            "vendor:vendor_profiles(id,name)",
          ].join(","),
        )
        .order("updated_at", { ascending: false })
        .limit(limit)
    : Promise.resolve({ data: [] as AlcoholInventoryRow[], error: null });

  const [foodResult, alcoholResult, session] = await Promise.all([
    foodPromise,
    alcoholPromise,
    fetchActiveCountSession(supabase),
  ]);

  if (foodResult.error) {
    throw foodResult.error;
  }
  if (alcoholResult.error) {
    throw alcoholResult.error;
  }

  const foodRows = (foodResult.data ?? []) as unknown as FoodInventoryRow[];
  const alcoholRows = (alcoholResult.data ?? []) as unknown as AlcoholInventoryRow[];
  const foodItems = foodRows.map(mapFoodRow);
  const alcoholItems = alcoholRows.map(mapAlcoholRow);

  return {
    items: [...foodItems, ...alcoholItems],
    generatedAt: new Date().toISOString(),
    session,
  };
}

async function fetchActiveCountSession(client: SupabaseClient): Promise<InventoryCountSessionSummary | null> {
  try {
    const { data, error } = await client
      .from("inventory_count_sessions")
      .select(
        "id,label,focus_zone,started_at,status,counted_items:inventory_count_session_entries(item_id)",
      )
      .eq("status", "open")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("fetchActiveCountSession error", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSessionRow(data);
  } catch (error) {
    console.warn("inventory_count_sessions unavailable", error);
    return null;
  }
}

export async function fetchCountSessionById(sessionId: string): Promise<InventoryCountSessionSummary | null> {
  const client = requireInventoryAdmin();
  const { data, error } = await client
    .from("inventory_count_sessions")
    .select("id,label,focus_zone,started_at,status,counted_items:inventory_count_session_entries(item_id)")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    console.warn("fetchCountSessionById error", error);
    return null;
  }
  if (!data) {
    return null;
  }
  return mapSessionRow(data);
}

export async function ensureOpenInventorySession(label?: string, focusZone?: string) {
  const client = requireInventoryAdmin();
  const existing = await fetchActiveCountSession(client);
  if (existing) {
    return existing;
  }

  const sessionLabel =
    label ?? `Service Count · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date())}`;

  const { data, error } = await client
    .from("inventory_count_sessions")
    .insert({
      label: sessionLabel,
      focus_zone: focusZone ?? null,
      status: "open",
    })
    .select("id,label,focus_zone,started_at,status,counted_items:inventory_count_session_entries(item_id)")
    .single();

  if (error) {
    throw error;
  }

  return mapSessionRow(data);
}

export async function fetchInventoryItemById(itemId: string, itemType: InventoryItemType): Promise<InventoryGridItem | null> {
  const client = requireInventoryAdmin();
  if (itemType === "alcohol") {
    const { data, error } = await client
      .from("alcohol_inventory_items")
      .select(
        [
          "id",
          "name",
          "category",
          "storage_zone",
          "unit_size",
          "bottle_count",
          "par_level",
          "minimum_threshold",
          "vendor_id",
          "updated_at",
          "vendor:vendor_profiles(id,name,punctuality_rating,cost_drift_percent)",
        ].join(","),
      )
      .eq("id", itemId)
      .maybeSingle();

    if (error) {
      console.error("fetchInventoryItemById alcohol error", error);
      return null;
    }
    return data ? mapAlcoholRow(data as unknown as AlcoholInventoryRow) : null;
  }

  const { data, error } = await client
    .from("food_inventory_items")
    .select(
      [
        "id",
        "name",
        "category",
        "storage_zone",
        "unit_type",
        "on_hand_quantity",
        "par_level",
        "minimum_threshold",
        "vendor_id",
        "last_counted_at",
        "updated_at",
        "vendor:vendor_profiles(id,name,punctuality_rating,cost_drift_percent)",
      ].join(","),
    )
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("fetchInventoryItemById food error", error);
    return null;
  }
  return data ? mapFoodRow(data as unknown as FoodInventoryRow) : null;
}

function mapSessionRow(data: InventoryCountSessionRow): InventoryCountSessionSummary {
  return {
    id: data.id,
    label: data.label ?? "Untitled session",
    startedAt: data.started_at ?? new Date().toISOString(),
    focusZone: data.focus_zone,
    countedItemIds: (data.counted_items ?? [])
      .filter((entry): entry is { item_id: string } => Boolean(entry?.item_id))
      .map((entry) => entry.item_id),
    status: data.status === "closed" ? "closed" : "open",
  };
}

function mapFoodRow(row: FoodInventoryRow): InventoryGridItem {
  return {
    id: row.id,
    itemType: "food",
    name: row.name,
    category: row.category ?? null,
    location: row.storage_zone ?? null,
    unit: row.unit_type ?? null,
    onHand: toNumber(row.on_hand_quantity) ?? 0,
    parLevel: toNumber(row.par_level),
    minimumThreshold: toNumber(row.minimum_threshold),
    vendorId: row.vendor_id ?? row.vendor?.id ?? null,
    vendorName: row.vendor?.name ?? null,
    vendorPunctuality: toNumber(row.vendor?.punctuality_rating ?? null),
    vendorCostDrift: toNumber(row.vendor?.cost_drift_percent ?? null),
    lastCountedAt: row.last_counted_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapAlcoholRow(row: AlcoholInventoryRow): InventoryGridItem {
  return {
    id: row.id,
    itemType: "alcohol",
    name: row.name,
    category: row.category ?? null,
    location: row.storage_zone ?? null,
    unit: row.unit_size ?? "bottle",
    onHand: toNumber(row.bottle_count) ?? 0,
    parLevel: toNumber(row.par_level),
    minimumThreshold: toNumber(row.minimum_threshold),
    vendorId: row.vendor_id ?? row.vendor?.id ?? null,
    vendorName: row.vendor?.name ?? null,
    vendorPunctuality: toNumber(row.vendor?.punctuality_rating ?? null),
    vendorCostDrift: toNumber(row.vendor?.cost_drift_percent ?? null),
    lastCountedAt: null,
    updatedAt: row.updated_at ?? null,
  };
}
