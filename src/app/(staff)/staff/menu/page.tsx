"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import {
  MenuHeaderControls,
  MenuLegend,
  MenuSectionGroup,
  MenuState,
} from "@/components/menu-surface";
import type {
  MenuRowBusyState,
  MenuSection,
  MenuStatusFilter,
  MenuViewState,
} from "@/types/menu";
import { useMenuData } from "@/hooks/staff/useMenuData";
import { useMenuActions } from "@/hooks/staff/useMenuActions";
import { formatServiceDate, formatWindow, formatSyncTime } from "@/lib/staff/menuFormatters";

export default function StaffMenuPage() {
  const { data, loading, error, refresh, mutate } = useMenuData();
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>("all");
  const [rowBusy, setRowBusy] = useState<Record<string, MenuRowBusyState | undefined>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
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

  const getSections = useCallback(() => sectionsRef.current, []);

  const availableTags = useMemo(() => {
    if (!data) return [];
    const tagSet = new Set<string>();
    data.sections.forEach((section) => {
      section.items.forEach((item) => {
        item.tags.forEach((tag) => tagSet.add(tag));
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const availableStations = useMemo(() => {
    if (!data) return [];
    const stationSet = new Set<string>();
    data.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.station) {
          stationSet.add(item.station);
        }
      });
    });
    return Array.from(stationSet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredSections = useMemo(() => {
    if (!data) return [];
    const searchLower = searchTerm.trim().toLowerCase();
    const activeTags = tagFilter;
    const stationValue = stationFilter.toLowerCase();

    return data.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const matchesService = serviceFilter
            ? item.serviceSlugs.includes(serviceFilter)
            : true;
          const matchesStatus = statusFilter === "all" || item.status === statusFilter;
          const matchesSearch =
            !searchLower ||
            item.name.toLowerCase().includes(searchLower) ||
            item.shortDescription.toLowerCase().includes(searchLower);
          const matchesTags =
            activeTags.length === 0 || activeTags.every((tag) => item.tags.includes(tag));
          const matchesStation =
            stationFilter === "all"
              ? true
              : (item.station ?? "").toLowerCase() === stationValue;
          return (
            matchesService && matchesStatus && matchesSearch && matchesTags && matchesStation
          );
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [data, serviceFilter, statusFilter, searchTerm, tagFilter, stationFilter]);

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

  const viewState: MenuViewState = loading
    ? "loading"
    : error
      ? "error"
      : filteredSections.length === 0
        ? "empty"
        : "ready";

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
  const { toggleAvailability, toggleVisibility, reorderItem } = useMenuActions({
    getSections,
    mutate,
    refresh,
    setRowBusy: setRowBusyState,
  });

  const toggleTagFilter = useCallback((tag: string) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((entry) => entry !== tag) : [...prev, tag],
    );
  }, []);

  const clearTagFilter = useCallback(() => setTagFilter([]), []);

  const handleStationChange = useCallback((value: string) => {
    setStationFilter(value);
  }, []);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const stateLayer =
    viewState === "loading" ? (
      <MenuState variant="loading" title="Updating menu data" message="Syncing live menu feed…" />
    ) : viewState === "error" ? (
      <MenuState
        variant="error"
        title="Menu data unavailable"
        message={error ?? "We could not reach the live POS feed."}
      />
    ) : viewState === "empty" ? (
      <MenuState
        variant="empty"
        title="No dishes in this view"
        message="Adjust filters to bring items back into frame."
      />
    ) : null;

  return (
    <SiteShell>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-10 lg:px-12">
        <PageHeader
          title="Menu"
          subtitle="Staff Console · Plates in Flight"
          className="[&>h1]:text-3xl [&>h1]:sm:text-4xl [&>h1]:md:text-[44px] [&>h1]:tracking-tight"
        />

        <MenuHeaderControls
          serviceOptions={data?.services ?? []}
          statusOptions={data?.statusOptions ?? []}
          serviceFilter={serviceFilter}
          statusFilter={statusFilter}
          onServiceChange={setServiceFilter}
          onStatusChange={setStatusFilter}
          contextLabel={contextLabel}
          lastSyncedLabel={lastSyncedLabel}
        >
          <MenuAdvancedFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            tags={availableTags}
            selectedTags={tagFilter}
            onToggleTag={toggleTagFilter}
            onClearTags={clearTagFilter}
            stations={availableStations}
            stationFilter={stationFilter}
            onStationChange={handleStationChange}
          />
        </MenuHeaderControls>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            {stateLayer ?? (
              <div className="space-y-10">
                {filteredSections.map((section) => (
                  <MenuSectionGroup
                    key={section.id}
                    section={section}
                    rowBusyMap={rowBusy}
                    collapsed={collapsedSections.has(section.id)}
                    onToggleCollapse={() => toggleSectionCollapse(section.id)}
                    onToggleAvailability={toggleAvailability}
                    onToggleVisibility={toggleVisibility}
                    onRequestReorder={reorderItem}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <MenuLegend />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

interface MenuAdvancedFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  stations: string[];
  stationFilter: string;
  onStationChange: (value: string) => void;
}

function MenuAdvancedFilters({
  searchTerm,
  onSearchTermChange,
  tags,
  selectedTags,
  onToggleTag,
  onClearTags,
  stations,
  stationFilter,
  onStationChange,
}: MenuAdvancedFiltersProps) {
  const limitedTags = tags.slice(0, 18);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-white/40">
        Search
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Name or descriptor"
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
        />
      </label>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-white/40">Tags</p>
        <div className="flex flex-wrap gap-2">
          {limitedTags.length === 0 ? (
            <span className="text-xs text-white/40">Tags populate after menu sync.</span>
          ) : (
            limitedTags.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={selectedTags.includes(tag)}
                onClick={() => onToggleTag(tag)}
              />
            ))
          )}
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={onClearTags}
              className="text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-white/80"
            >
              Reset tags
            </button>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-white/40">Stations</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All stations"
            active={stationFilter === "all"}
            onClick={() => onStationChange("all")}
          />
          {stations.map((station) => (
            <FilterChip
              key={station}
              label={station}
              active={stationFilter === station}
              onClick={() => onStationChange(station)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
        active
          ? "border-white/80 bg-white/10 text-white"
          : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}


