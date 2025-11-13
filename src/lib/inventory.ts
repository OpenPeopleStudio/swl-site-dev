import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

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
    console.error("listFoodInventory error", error);
    throw error;
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
    console.error("listAlcoholInventory error", error);
    throw error;
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
    console.error("listVendorProfiles error", error);
    throw error;
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
    console.error("listInventoryNotes error", error);
    throw error;
  }
  return data ?? [];
});
