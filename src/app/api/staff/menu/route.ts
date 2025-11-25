"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

const MENU_STATUSES = ["on", "prep", "eightySixed", "testing"] as const;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const [serviceRes, sectionRes, sectionItemsRes, itemRes, statusRes, syncRes] = await Promise.all([
      supabase
        .from("menu_services")
        .select("id, slug, label, service_date, window_start, window_end, status, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_sections")
        .select("id, slug, name, notes, service_slugs, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_section_items")
        .select("section_id, item_id, sort_index")
        .order("section_id", { ascending: true })
        .order("sort_index", { ascending: true }),
      supabase
        .from("menu_items")
        .select("id, slug, name, short_description, price, station, tags, service_slugs, visibility, last_updated_at")
        .order("name", { ascending: true }),
      supabase
        .from("menu_item_status")
        .select("item_id, status, notes, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_sync_log")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const services = serviceRes.data ?? [];
    const sections = sectionRes.data ?? [];
    const sectionItems = sectionItemsRes.data ?? [];
    const items = itemRes.data ?? [];
    const statusRows = statusRes.data ?? [];
    const lastSync = syncRes.data?.synced_at ?? new Date().toISOString();

    if (serviceRes.error) throw serviceRes.error;
    if (sectionRes.error) throw sectionRes.error;
    if (sectionItemsRes.error) throw sectionItemsRes.error;
    if (itemRes.error) throw itemRes.error;
    if (statusRes.error) throw statusRes.error;
    if (syncRes.error) throw syncRes.error;

    const serviceLabelBySlug = new Map<string, string>();
    services.forEach((service) => {
      serviceLabelBySlug.set(service.slug, service.label);
    });

    const latestStatusByItem = new Map<
      string,
      { status: (typeof MENU_STATUSES)[number]; notes: string | null; updatedAt: string }
    >();
    statusRows.forEach((entry) => {
      if (!latestStatusByItem.has(entry.item_id)) {
        latestStatusByItem.set(entry.item_id, {
          status: (entry.status as (typeof MENU_STATUSES)[number]) ?? "on",
          notes: entry.notes ?? null,
          updatedAt: entry.created_at,
        });
      }
    });

    const sectionItemMap = new Map<string, Array<{ itemId: string; sortIndex: number }>>();
    sectionItems.forEach((record) => {
      const bucket = sectionItemMap.get(record.section_id) ?? [];
      bucket.push({ itemId: record.item_id, sortIndex: record.sort_index ?? 0 });
      sectionItemMap.set(record.section_id, bucket);
    });

    const itemById = new Map<
      string,
      {
        id: string;
        name: string;
        shortDescription: string;
        price: number;
        station: string | null;
        tags: string[];
        serviceSlugs: string[];
        serviceLabels: string[];
        visibility: string;
        status: (typeof MENU_STATUSES)[number];
        lastUpdated: string;
      }
    >();

    items.forEach((item) => {
      const statusEntry = latestStatusByItem.get(item.id);
      const serviceSlugs = (item.service_slugs ?? []) as string[];
      itemById.set(item.id, {
        id: item.id,
        name: item.name,
        shortDescription: item.short_description ?? "",
        price: Number(item.price) ?? 0,
        station: item.station ?? null,
        tags: (item.tags ?? []) as string[],
        serviceSlugs,
        serviceLabels: serviceSlugs.map((slug) => serviceLabelBySlug.get(slug) ?? slug),
        visibility: item.visibility ?? "guest-facing",
        status: statusEntry?.status ?? "on",
        lastUpdated: item.last_updated_at ?? new Date().toISOString(),
      });
    });

    const sectionPayload = sections.map((section) => {
      const sectionServices = (section.service_slugs ?? []) as string[];
      const linkedItems = (sectionItemMap.get(section.id) ?? [])
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((entry) => itemById.get(entry.itemId))
        .filter(Boolean);

      return {
        id: section.id,
        name: section.name,
        notes: section.notes,
        serviceSlugs: sectionServices,
        serviceLabels: sectionServices.map((slug) => serviceLabelBySlug.get(slug) ?? slug),
        items: linkedItems,
      };
    });

    return NextResponse.json({
      services: services.map((service) => ({
        id: service.id,
        slug: service.slug,
        label: service.label,
        serviceDate: service.service_date,
        windowStart: service.window_start,
        windowEnd: service.window_end,
        status: service.status,
      })),
      sections: sectionPayload,
      statusOptions: MENU_STATUSES.map((value) => ({
        value,
        label: humanizeStatus(value),
      })),
      lastSyncedAt: lastSync,
    });
  } catch (error) {
    console.error("Staff menu fetch failed", error);
    return NextResponse.json({ error: "Unable to load menu data" }, { status: 500 });
  }
}

function humanizeStatus(value: (typeof MENU_STATUSES)[number]) {
  switch (value) {
    case "eightySixed":
      return "86'd";
    case "prep":
      return "Prep";
    case "testing":
      return "Testing";
    default:
      return "On";
  }
}

