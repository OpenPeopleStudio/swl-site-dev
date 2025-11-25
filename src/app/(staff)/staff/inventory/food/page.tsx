"use server";

import { type ComponentProps } from "react";
import { FoodInventoryDashboard } from "@/apps/staff-console/boh/inventory/food/FoodInventoryDashboard";
import { InventorySchedulePreview } from "../InventorySchedulePreview";
import {
  listFoodInventory,
  listInventoryNotes,
  listVendorProfiles,
} from "@/lib/staff/inventory";
import type { ScheduleAssignment } from "@/domains/staff/schedule/types";

function formatTimestamp(value?: string | null) {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNoteTimestamp(value?: string | null) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
  });
}

type FoodDashboardProps = ComponentProps<typeof FoodInventoryDashboard>;

export default async function FoodInventoryRoute() {
  const [items, notesRaw, vendors] = await Promise.all([
    listFoodInventory(40),
    listInventoryNotes(6),
    listVendorProfiles(6),
  ]);

  const vendorMap = new Map(
    vendors.map((vendor) => [vendor.id, vendor.name ?? "Vendor"]),
  );

  const alerts =
    items
      .filter(
        (item) =>
          typeof item.on_hand_quantity === "number" &&
          typeof item.minimum_threshold === "number" &&
          item.on_hand_quantity < item.minimum_threshold,
      )
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        label: `${item.name} below par`,
        tone: "warning" as const,
      })) ?? [];

  const notes = (notesRaw ?? []).map((note) => ({
    id: note.id ?? crypto.randomUUID(),
    author: note.author_id ?? "Owner",
    body: note.note ?? "",
    timestamp: formatNoteTimestamp(note.created_at),
    tags: note.tags ?? [],
  }));

  const autoReplenish: FoodDashboardProps["autoReplenish"] = items
    .filter((item) => typeof item.par_level === "number")
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      ingredient: item.name,
      recommendedQuantity: Number(
        Math.max(0, (item.par_level ?? 0) - (item.on_hand_quantity ?? 0)).toFixed(1),
      ),
      unit: "units",
      vendor: vendorMap.get(item.vendor_id ?? ""),
      eta: "Next 24h",
      reasoning: "Upcoming menu load + current reservations",
    }));

  const forecasts = items.slice(0, 4).map((item, index) => ({
    id: item.id,
    ingredient: item.name,
    trend: index % 3 === 0 ? ("up" as const) : index % 2 === 0 ? ("down" as const) : ("steady" as const),
    changePercent: index % 3 === 0 ? 5.2 : index % 2 === 0 ? -3.1 : 0,
    note: item.category
      ? `${item.category} market signal`
      : "Monitoring supplier variance",
  }));

  const storageMap = Object.values(
    items.reduce<Record<string, { zone: string; items: Array<{ name: string; quantity?: number }> }>>(
      (acc, item) => {
        const zone = item.storage_zone ?? "Walk-in";
        if (!acc[zone]) {
          acc[zone] = { zone, items: [] };
        }
        acc[zone].items.push({
          name: item.name,
          quantity: item.on_hand_quantity ?? undefined,
        });
        return acc;
      },
      {},
    ),
  ).map((entry, index) => ({
    id: `${entry.zone}-${index}`,
    zone: entry.zone,
    shelf: `Shelf ${String.fromCharCode(65 + (index % 4))}`,
    items: entry.items.slice(0, 4),
  }));

  const itemsWithVendorNames = items.map((item) => ({
    ...item,
    vendor_name: vendorMap.get(item.vendor_id ?? "") ?? undefined,
  }));

  const inventoryScheduleAssignments = buildInventoryAssignments(autoReplenish);

  return (
    <div className="w-full">
      <FoodInventoryDashboard
        timestamp={formatTimestamp(new Date().toISOString())}
        alerts={alerts}
        items={itemsWithVendorNames}
        notes={notes}
        vendors={vendors.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          punctuality: vendor.punctuality_rating ?? undefined,
          costDrift: vendor.cost_drift_percent ?? undefined,
          reliability: vendor.weekend_reliability ?? undefined,
          notes: vendor.notes ?? undefined,
        }))}
        autoReplenish={autoReplenish}
        forecasts={forecasts}
        storageMap={storageMap}
      />
      <InventorySchedulePreview assignments={inventoryScheduleAssignments} />
    </div>
  );
}

function buildInventoryAssignments(entries: FoodDashboardProps["autoReplenish"]): ScheduleAssignment[] {
  return entries.slice(0, 5).map((entry, index) => {
    const startHour = 8 + index * 2;
    const endHour = startHour + 1;
    return {
      id: `inventory-schedule-${entry.id ?? index}`,
      staffId: null,
      staffName: entry.vendor ?? "Procurement Cell",
      staffRole: "Procurement",
      focus: "ops",
      station: entry.ingredient ?? "Inventory",
      role: "Replenish",
      start: formatHourSlot(startHour),
      end: formatHourSlot(endHour),
      note: `Target ${entry.recommendedQuantity} ${entry.unit} · ${entry.reasoning}`,
      status: "tentative",
    };
  });
}

function formatHourSlot(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  return `${String(normalized).padStart(2, "0")}:00`;
}
