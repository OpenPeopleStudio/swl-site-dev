'use client';

import { useMemo, useState, useCallback } from "react";
import { InventoryTopBar } from "@/apps/staff-console/boh/inventory/InventoryTopBar";
import { InventorySearchBar } from "@/apps/staff-console/boh/inventory/InventorySearchBar";
import { InventoryNotesPanel } from "@/apps/staff-console/boh/inventory/InventoryNotesPanel";
import { FoodItemCard } from "@/apps/staff-console/boh/inventory/food/FoodItemCard";
import { FoodCountPane } from "@/apps/staff-console/boh/inventory/food/FoodCountPane";
import { FoodReceivingPane } from "@/apps/staff-console/boh/inventory/food/FoodReceivingPane";
import { FoodVendorPanel } from "@/apps/staff-console/boh/inventory/food/FoodVendorPanel";
import { FoodAutoReplenishPanel } from "@/apps/staff-console/boh/inventory/food/FoodAutoReplenishPanel";
import { FoodForecastPanel } from "@/apps/staff-console/boh/inventory/food/FoodForecastPanel";
import { FoodStorageMapViewer } from "@/apps/staff-console/boh/inventory/food/FoodStorageMapViewer";
import { FoodWasteModal } from "@/apps/staff-console/boh/inventory/food/FoodWasteModal";

type FoodInventoryDashboardProps = {
  timestamp: string;
  alerts: { id: string; label: string; tone?: "warning" | "info" | "ok" }[];
  items: Array<{
    id: string;
    name: string;
    category?: string | null;
  storage_zone?: string | null;
  on_hand_quantity?: number | null;
  par_level?: number | null;
  minimum_threshold?: number | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  cost_per_unit?: number | null;
  last_invoice_cost?: number | null;
}>;
  notes: Array<{
    id: string;
    author: string;
    body: string;
    timestamp: string;
    tags?: string[];
  }>;
  vendors: Array<{
    id: string;
    name: string;
    punctuality?: number | null;
    costDrift?: number | null;
    reliability?: number | null;
    notes?: string | null;
  }>;
  autoReplenish: Array<{
    id: string;
    ingredient: string;
    recommendedQuantity: number;
    unit: string;
    vendor?: string;
    eta?: string;
    reasoning?: string;
  }>;
  forecasts: Array<{
    id: string;
    ingredient: string;
    trend: "up" | "down" | "steady";
    changePercent: number;
    note: string;
  }>;
  storageMap: Array<{
    id: string;
    zone: string;
    shelf?: string | null;
    bin?: string | null;
    capacity?: number | null;
  items: Array<{ name: string; quantity?: number | null }>;
}>;
};

export function FoodInventoryDashboard({
  timestamp,
  alerts,
  items: initialItems,
  notes,
  vendors,
  autoReplenish: initialAutoReplenish = [],
  forecasts,
  storageMap,
}: FoodInventoryDashboardProps) {
  const [items, setItems] = useState(initialItems);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);

  const vendorMap = useMemo(
    () =>
      new Map(
        vendors.map((vendor) => [vendor.id, vendor.name ?? "Vendor"]),
      ),
    [vendors],
  );

  const derivedAutoReplenish = useMemo(() => {
    return items
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
        reasoning: "Upcoming reservations + prep engine load",
      }));
  }, [items, vendorMap]);

  const itemsForSelect = useMemo(
    () => items.map((item) => ({ id: item.id, name: item.name })),
    [items],
  );

  const handleReceive = useCallback(
    async (payload: {
      itemId: string;
      quantity: number;
      costPerUnit?: number;
      vendorId?: string;
      notes?: string;
    }) => {
      setIsReceiving(true);
      try {
        const response = await fetch("/api/staff/inventory/food/receive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: payload.itemId,
            quantity: payload.quantity,
            costPerUnit: payload.costPerUnit,
            vendorId: payload.vendorId,
            notes: payload.notes,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Receive failed");
        setItems((prev) =>
          prev.map((item) =>
            item.id === data.item_id
              ? {
                  ...item,
                  on_hand_quantity: data.new_on_hand,
                  last_invoice_cost: data.last_invoice_cost ?? item.last_invoice_cost,
                }
              : item,
          ),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsReceiving(false);
      }
    },
    [],
  );

  const handleCount = useCallback(
    async (payload: { itemId: string; quantity: number }) => {
      setIsCounting(true);
      try {
        const response = await fetch("/api/staff/inventory/food/count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: payload.itemId,
            quantity: payload.quantity,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Count failed");
        setItems((prev) =>
          prev.map((item) =>
            item.id === data.item_id
              ? {
                  ...item,
                  on_hand_quantity: data.new_on_hand,
                  last_counted_at: new Date().toISOString(),
                }
              : item,
          ),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsCounting(false);
      }
    },
    [],
  );

  const handleWaste = useCallback(
    async (payload: { itemId: string; quantity: number; reason?: string; notes?: string }) => {
      try {
        const response = await fetch("/api/staff/inventory/food/waste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: payload.itemId,
            quantity: payload.quantity,
            reason: payload.reason,
            notes: payload.notes,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Waste log failed");
        setItems((prev) =>
          prev.map((item) =>
            item.id === data.item_id
              ? {
                  ...item,
                  on_hand_quantity: data.new_on_hand,
                }
              : item,
          ),
        );
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  const autoReplenish = derivedAutoReplenish.length > 0 ? derivedAutoReplenish : initialAutoReplenish;

  return (
    <div className="space-y-6">
      <InventoryTopBar title="Food Inventory" timestamp={timestamp} alerts={alerts} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <InventorySearchBar
          onSearch={(value) => {
            console.log("Search", value);
          }}
          dataHints={["walk-in", "freezer", "dairy", "vendor"]}
        />
        <button
          type="button"
          onClick={() => setIsWasteOpen(true)}
          className="rounded-2xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/60"
        >
          Log Waste
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <FoodItemCard
                key={item.id}
                name={item.name}
                category={item.category}
                storageZone={item.storage_zone}
                onHand={item.on_hand_quantity}
                parLevel={item.par_level}
                minimum={item.minimum_threshold}
                vendorName={item.vendor_name ?? "Primary vendor"}
                costPerUnit={item.cost_per_unit ?? undefined}
                lastInvoiceCost={item.last_invoice_cost ?? undefined}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <FoodCountPane
            items={itemsForSelect}
            onSubmit={handleCount}
            isSubmitting={isCounting}
          />
          <FoodReceivingPane
            items={itemsForSelect}
            onReceive={handleReceive}
            isSubmitting={isReceiving}
          />
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FoodVendorPanel vendors={vendors} />
        <FoodAutoReplenishPanel recommendations={autoReplenish} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FoodForecastPanel forecasts={forecasts} />
        <FoodStorageMapViewer locations={storageMap} />
      </div>

      <InventoryNotesPanel notes={notes} />

      <FoodWasteModal
        isOpen={isWasteOpen}
        onClose={() => setIsWasteOpen(false)}
        items={itemsForSelect}
        onSubmit={handleWaste}
      />
    </div>
  );
}
