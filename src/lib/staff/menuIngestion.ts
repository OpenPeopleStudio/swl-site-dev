"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuStatus, MenuVisibility } from "@/types/menu";

type PosCategoryRow = {
  id: string;
  label: string;
  display_order: number | null;
  is_active: boolean | null;
};

type PosItemRow = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | string;
  tags: string[] | null;
  available: boolean | null;
  display_order: number | null;
};

const DEFAULT_SERVICES = [
  { slug: "lunch", label: "Lunch", windowStart: "11:30", windowEnd: "14:30" },
  { slug: "dinner", label: "Dinner", windowStart: "17:00", windowEnd: "23:00" },
  { slug: "tasting", label: "Tasting", windowStart: "20:00", windowEnd: "23:30" },
] as const;

export type MenuIngestionSummary = {
  sectionsProcessed: number;
  itemsProcessed: number;
  statusesInserted: number;
};

export async function runMenuIngestion(
  supabase: SupabaseClient,
): Promise<MenuIngestionSummary> {
  await ensureBaselineServices(supabase);

  const [{ data: categories, error: categoryError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from("pos_menu_categories")
        .select("id, label, display_order, is_active"),
      supabase
        .from("pos_menu_items")
        .select("id, category_id, name, description, price, tags, available, display_order"),
    ]);

  if (categoryError) {
    throw categoryError;
  }
  if (itemsError) {
    throw itemsError;
  }

  const activeCategories = (categories ?? []).filter(
    (category) => category.is_active !== false,
  );
  const categorySlugMap = new Map<string, { slug: string; label: string }>();
  const usedSectionSlugs = new Set<string>();
  activeCategories.forEach((category) => {
    const baseSlug = slugify(category.label);
    const candidateSlug = usedSectionSlugs.has(baseSlug)
      ? `${baseSlug}-${category.id.slice(0, 8)}`
      : baseSlug;
    usedSectionSlugs.add(candidateSlug);
    categorySlugMap.set(category.id, { slug: candidateSlug, label: category.label });
  });

  const sectionUpserts = activeCategories.map((category, index) => ({
    slug: categorySlugMap.get(category.id)?.slug ?? slugify(category.label),
    name: category.label,
    notes: null,
    service_slugs: inferServiceSlugs(category.label),
    sort_order: category.display_order ?? (index + 1) * 10,
  }));

  if (sectionUpserts.length > 0) {
    await supabase
      .from("menu_sections")
      .upsert(sectionUpserts, { onConflict: "slug" });
  }

  const { data: existingSections } = await supabase
    .from("menu_sections")
    .select("id, slug");
  const activeSectionSlugSet = new Set(sectionUpserts.map((section) => section.slug));
  await deleteStaleRows(
    supabase,
    "menu_sections",
    existingSections?.filter((section) => !activeSectionSlugSet.has(section.slug)) ?? [],
  );
  const sectionIdBySlug = new Map(
    (existingSections ?? [])
      .filter((section) => activeSectionSlugSet.has(section.slug))
      .map((section) => [section.slug, section.id]),
  );

  const sectionServiceMap = new Map(
    sectionUpserts.map((section) => [section.slug, section.service_slugs]),
  );

  const itemUpserts = (items ?? []).map((item) => {
    const categorySlug = categorySlugMap.get(item.category_id ?? "")?.slug;
    const serviceSlugs =
      (categorySlug ? sectionServiceMap.get(categorySlug) : undefined) ??
      inferServiceSlugs(categorySlugMap.get(item.category_id ?? "")?.label ?? "");
    const baseSlug = slugify(item.name);
    const slug = `${baseSlug}-${item.id.slice(0, 8)}`;
    return {
      slug,
      name: item.name,
      short_description: item.description ?? "",
      price: Number(item.price) || 0,
      station: inferStation(item.tags ?? [], categorySlugMap.get(item.category_id ?? "")?.label),
      tags: (item.tags ?? []).filter(Boolean),
      service_slugs: serviceSlugs,
      visibility: inferVisibility(item.available),
    };
  });

  if (itemUpserts.length > 0) {
    await supabase.from("menu_items").upsert(itemUpserts, { onConflict: "slug" });
  }

  const { data: existingItems } = await supabase
    .from("menu_items")
    .select("id, slug");
  const activeItemSlugs = new Set(itemUpserts.map((item) => item.slug));
  await deleteStaleRows(
    supabase,
    "menu_items",
    existingItems?.filter((item) => !activeItemSlugs.has(item.slug)) ?? [],
  );
  const itemIdBySlug = new Map(
    (existingItems ?? [])
      .filter((item) => activeItemSlugs.has(item.slug))
      .map((item) => [item.slug, item.id]),
  );

  const linkRecords = (items ?? [])
    .map((item, index) => {
      const categorySlug = categorySlugMap.get(item.category_id ?? "")?.slug;
      if (!categorySlug) return null;
      const sectionId = sectionIdBySlug.get(categorySlug);
      const itemSlug = `${slugify(item.name)}-${item.id.slice(0, 8)}`;
      const itemId = itemIdBySlug.get(itemSlug);
      if (!sectionId || !itemId) return null;
      return {
        section_id: sectionId,
        item_id: itemId,
        sort_index: item.display_order ?? (index + 1) * 10,
      };
    })
    .filter(Boolean) as Array<{ section_id: string; item_id: string; sort_index: number }>;

  if (linkRecords.length > 0) {
    await supabase
      .from("menu_section_items")
      .upsert(linkRecords, { onConflict: "section_id,item_id" });
  }

  await pruneSectionLinks(supabase, linkRecords);

  const statusesInserted = await syncStatuses(supabase, items ?? [], itemIdBySlug);

  await supabase.from("menu_sync_log").insert({
    source: "pos_bridge",
    records_processed: items?.length ?? 0,
  });

  return {
    sectionsProcessed: sectionUpserts.length,
    itemsProcessed: itemUpserts.length,
    statusesInserted,
  };
}

async function ensureBaselineServices(supabase: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("menu_services")
    .select("slug");

  if (existing && existing.length > 0) {
    return;
  }

  const payload = DEFAULT_SERVICES.map((service, index) => ({
    slug: service.slug,
    label: service.label,
    service_date: today,
    window_start: service.windowStart,
    window_end: service.windowEnd,
    status: index === 1 ? "boarding" : "scheduled",
    is_active: true,
    sort_order: (index + 1) * 10,
  }));

  await supabase.from("menu_services").insert(payload);
}

async function deleteStaleRows(
  supabase: SupabaseClient,
  table: "menu_sections" | "menu_items",
  rows: Array<{ id: string }>,
) {
  if (!rows.length) return;
  await supabase.from(table).delete().in("id", rows.map((row) => row.id));
}

async function pruneSectionLinks(
  supabase: SupabaseClient,
  desiredLinks: Array<{ section_id: string; item_id: string }>,
) {
  const { data: existingLinks } = await supabase
    .from("menu_section_items")
    .select("id, section_id, item_id");
  const desiredKey = new Set(
    desiredLinks.map((link) => `${link.section_id}:${link.item_id}`),
  );
  const staleIds =
    existingLinks
      ?.filter((link) => !desiredKey.has(`${link.section_id}:${link.item_id}`))
      .map((link) => link.id) ?? [];
  if (staleIds.length > 0) {
    await supabase.from("menu_section_items").delete().in("id", staleIds);
  }
}

async function syncStatuses(
  supabase: SupabaseClient,
  posItems: PosItemRow[],
  itemIdBySlug: Map<string, string>,
) {
  const { data: latestStatuses } = await supabase
    .from("menu_item_status")
    .select("item_id, status, created_at")
    .order("created_at", { ascending: false });

  const latestStatusMap = new Map<string, MenuStatus>();
  (latestStatuses ?? []).forEach((row) => {
    if (!latestStatusMap.has(row.item_id)) {
      latestStatusMap.set(row.item_id, row.status as MenuStatus);
    }
  });

  const inserts: Array<{ item_id: string; status: MenuStatus; source: string }> = [];

  posItems.forEach((posItem) => {
    const slug = `${slugify(posItem.name)}-${posItem.id.slice(0, 8)}`;
    const itemId = itemIdBySlug.get(slug);
    if (!itemId) return;
    const targetStatus: MenuStatus = posItem.available === false ? "eightySixed" : "on";
    if (latestStatusMap.get(itemId) === targetStatus) return;
    inserts.push({
      item_id: itemId,
      status: targetStatus,
      source: "pos_bridge",
    });
  });

  if (inserts.length > 0) {
    await supabase.from("menu_item_status").insert(inserts);
  }

  return inserts.length;
}

function inferServiceSlugs(label: string | undefined) {
  const normalized = (label ?? "").toLowerCase();
  if (normalized.includes("lunch")) return ["lunch"];
  if (normalized.includes("tasting")) return ["tasting"];
  if (normalized.includes("dessert")) return ["dinner", "tasting"];
  return ["dinner"];
}

function inferVisibility(available: boolean | null | undefined): MenuVisibility {
  return available === false ? "staff-only" : "guest-facing";
}

function inferStation(tags: string[], categoryLabel?: string | null) {
  const candidates = tags.map((tag) => tag.toLowerCase());
  const label = (categoryLabel ?? "").toLowerCase();
  if (candidates.includes("bar") || label.includes("bar")) return "bar";
  if (label.includes("dessert") || label.includes("pastry")) return "pastry";
  if (label.includes("cold") || candidates.includes("cold")) return "cold line";
  if (label.includes("snack")) return "garde manger";
  return "hot line";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


