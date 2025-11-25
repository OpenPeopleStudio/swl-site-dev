"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MenuHeaderControls,
  MenuLegend,
  MenuSectionGroup,
  MenuState,
} from "@/components/menu-surface";
import type {
  MenuRowBusyState,
  MenuSection,
  MenuStatus,
  MenuStatusFilter,
  MenuVisibility,
} from "@/types/menu";
import { useMenuData } from "@/hooks/staff/useMenuData";
import { useMenuActions } from "@/hooks/staff/useMenuActions";
import { formatServiceDate, formatWindow, formatSyncTime } from "@/lib/staff/menuFormatters";

export function OwnerMenuSectionsPreview() {
  const { data, loading, error, refresh, mutate } = useMenuData();
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>("all");
  const [rowBusy, setRowBusy] = useState<Record<string, MenuRowBusyState | undefined>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"status" | "visibility" | null>(null);
  const sectionsRef = useRef<MenuSection[]>([]);

  useEffect(() => {
    if (!serviceFilter && data?.services.length) {
      setServiceFilter(data.services[0].slug);
    }
  }, [data?.services, serviceFilter]);

  useEffect(() => {
    if (data?.sections) {
      sectionsRef.current = data.sections;
    }
  }, [data?.sections]);

  useEffect(() => {
    setSelectedItems(new Set());
  }, [serviceFilter, statusFilter]);

  const filteredSections = useMemo(() => {
    if (!data) return [];
    return data.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const matchesService = serviceFilter
            ? item.serviceSlugs.includes(serviceFilter)
            : true;
          const matchesStatus = statusFilter === "all" || item.status === statusFilter;
          return matchesService && matchesStatus;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [data, serviceFilter, statusFilter]);

  const visibleItemIds = useMemo(
    () => filteredSections.flatMap((section) => section.items.map((item) => item.id)),
    [filteredSections],
  );

  const selectedService = useMemo(() => {
    if (!data?.services.length) return null;
    return data.services.find((svc) => svc.slug === serviceFilter) ?? data.services[0];
  }, [data?.services, serviceFilter]);

  const contextLabel = selectedService
    ? `${selectedService.label} · ${formatServiceDate(selectedService.serviceDate)} · ${formatWindow(
        selectedService.windowStart,
        selectedService.windowEnd,
      )}`
    : "Select service";

  const lastSyncedLabel = data ? formatSyncTime(data.lastSyncedAt) : "—";

  const setRowBusyState = useCallback((itemId: string, state?: MenuRowBusyState) => {
    setRowBusy((prev) => {
      if (state) {
        return { ...prev, [itemId]: state };
      }
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const getSections = useCallback(() => sectionsRef.current, []);

  const {
    toggleAvailability,
    toggleVisibility,
    reorderItem,
    bulkSetStatus,
    bulkSetVisibility,
  } = useMenuActions({
    getSections,
    mutate,
    refresh,
    setRowBusy: setRowBusyState,
  });

  const handleSelectToggle = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setSelectedItems(new Set(visibleItemIds));
  }, [visibleItemIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleBulkStatus = useCallback(
    async (status: MenuStatus) => {
      if (!selectedItems.size) return;
      setBulkBusy("status");
      await bulkSetStatus(Array.from(selectedItems), status);
      setBulkBusy(null);
    },
    [bulkSetStatus, selectedItems],
  );

  const handleBulkVisibility = useCallback(
    async (visibility: MenuVisibility) => {
      if (!selectedItems.size) return;
      setBulkBusy("visibility");
      await bulkSetVisibility(Array.from(selectedItems), visibility);
      setBulkBusy(null);
    },
    [bulkSetVisibility, selectedItems],
  );

  if (loading) {
    return (
      <MenuState
        variant="loading"
        title="Syncing Menu"
        message="Mirroring staff console layout…"
      />
    );
  }

  if (error || !data) {
    return (
      <MenuState
        variant="error"
        title="Menu mirror unavailable"
        message={error ?? "Unable to reach staff menu API."}
      />
    );
  }

  if (!filteredSections.length) {
    return (
      <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
        <MenuHeaderControls
          serviceOptions={data.services}
          statusOptions={data.statusOptions}
          serviceFilter={serviceFilter}
          statusFilter={statusFilter}
          onServiceChange={setServiceFilter}
          onStatusChange={setStatusFilter}
          contextLabel={contextLabel}
          lastSyncedLabel={lastSyncedLabel}
        />
        <MenuState
          variant="empty"
          title="No dishes match filters"
          message="Adjust service or status filters to preview menu data."
        />
      </section>
    );
  }

  const selectionState = {
    isSelected: (itemId: string) => selectedItems.has(itemId),
    toggle: handleSelectToggle,
  };

  return (
    <section className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <MenuHeaderControls
        serviceOptions={data.services}
        statusOptions={data.statusOptions}
        serviceFilter={serviceFilter}
        statusFilter={statusFilter}
        onServiceChange={setServiceFilter}
        onStatusChange={setStatusFilter}
        contextLabel={contextLabel}
        lastSyncedLabel={lastSyncedLabel}
      />

      <BulkActionsPanel
        selectedCount={selectedItems.size}
        hasVisibleItems={visibleItemIds.length > 0}
        onSelectAll={handleSelectAllVisible}
        onClearSelection={handleClearSelection}
        onSetStatus={handleBulkStatus}
        onSetVisibility={handleBulkVisibility}
        busyKind={bulkBusy}
      />

      <div className="space-y-8">
        {filteredSections.map((section) => (
          <MenuSectionGroup
            key={section.id}
            section={section}
            rowBusyMap={rowBusy}
            selectionState={selectionState}
            onToggleAvailability={toggleAvailability}
            onToggleVisibility={toggleVisibility}
            onRequestReorder={reorderItem}
          />
        ))}
      </div>

      <MenuLegend />
    </section>
  );
}

interface BulkActionsPanelProps {
  selectedCount: number;
  hasVisibleItems: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSetStatus: (status: MenuStatus) => void;
  onSetVisibility: (visibility: MenuVisibility) => void;
  busyKind: "status" | "visibility" | null;
}

function BulkActionsPanel({
  selectedCount,
  hasVisibleItems,
  onSelectAll,
  onClearSelection,
  onSetStatus,
  onSetVisibility,
  busyKind,
}: BulkActionsPanelProps) {
  const disabled = selectedCount === 0 || Boolean(busyKind);

  return (
    <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          {selectedCount > 0 ? `${selectedCount} items selected` : "Select items to enable bulk actions"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={!hasVisibleItems}
            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition enabled:hover:border-white/60 disabled:opacity-40"
          >
            Select visible
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedCount === 0}
            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition enabled:hover:border-white/60 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["on", "prep", "eightySixed", "testing"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onSetStatus(status as MenuStatus)}
            disabled={disabled}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition enabled:hover:border-white/60 disabled:opacity-40"
          >
            Set {status === "eightySixed" ? "86" : status}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSetVisibility("guest-facing")}
          disabled={disabled}
          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition enabled:hover:border-white/60 disabled:opacity-40"
        >
          Guest-facing
        </button>
        <button
          type="button"
          onClick={() => onSetVisibility("staff-only")}
          disabled={disabled}
          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition enabled:hover:border-white/60 disabled:opacity-40"
        >
          Staff-only
        </button>
      </div>
    </div>
  );
}
