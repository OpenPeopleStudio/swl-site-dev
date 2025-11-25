"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ScheduleGrid, ScheduleLegend } from "@/components/staff/ScheduleGrid";
import type { PrivateEvent } from "@/domains/events/lib/queries";
import type { ScheduleAssignment, ShiftFocus, ShiftStatus } from "@/domains/staff/schedule/types";

type DateScope = "day" | "week" | "month";
type EventsSurfaceState = "ready" | "loading" | "error";

type EventStatusToken =
  | "inquiry"
  | "curation"
  | "awaiting_guest"
  | "contract_out"
  | "confirmed"
  | "tentative"
  | "cancelled";

type EventKindToken = "buyout" | "large_party" | "internal" | "vendor" | "unknown";

type OperationalRequirementKey = "requires_special_menu" | "requires_extra_staff" | "kitchen_follow_up";

type EventNote = {
  id: string;
  event_id: string;
  note_type?: string | null;
  body: string;
  created_at: string;
};

interface EventsPageClientProps {
  events: PrivateEvent[];
}

type TimelineGroup = {
  dateKey: string;
  dateLabel: string;
  weekday: string;
  events: TimelineEvent[];
};

type TimelineEvent = {
  id: string;
  title: string;
  subtitle?: string | null;
  status: EventStatusToken;
  type: EventKindToken;
  headcount: number | null;
  dateLabel: string;
  weekday: string;
  timeLabel: string;
  budgetRange?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  operationalRequirements?: Record<string, boolean> | null;
  raw: PrivateEvent;
};

type Metric = {
  id: string;
  label: string;
  value: string;
  caption?: string;
};

type FilterOption<T> = {
  key: T;
  count: number;
};

type DateRangeValue = {
  start: string | null;
  end: string | null;
};

type UpdateEventPayload = {
  party_size?: number | null;
  status?: string;
  start_time?: string | null;
  end_time?: string | null;
  operational_requirements?: Record<string, boolean>;
};

const EVENTS_PAGE_SIZE = 60;
const DATE_SCOPE_COPY: Record<DateScope, { label: string; rangeCopy: string }> = {
  day: { label: "Day", rangeCopy: "Focus · 24h cadence" },
  week: { label: "Week", rangeCopy: "Planning · 7-day sweep" },
  month: { label: "Month", rangeCopy: "Strategy · 30-day horizon" },
};

const STATUS_ORDER: EventStatusToken[] = [
  "inquiry",
  "curation",
  "awaiting_guest",
  "contract_out",
  "confirmed",
  "tentative",
  "cancelled",
];

const TYPE_ORDER: EventKindToken[] = ["buyout", "large_party", "internal", "vendor", "unknown"];

const STATUS_META: Record<
  EventStatusToken,
  { label: string; tone: string; pill: string }
> = {
  inquiry: {
    label: "Inquiry",
    tone: "text-white/70",
    pill: "border-white/30 text-white",
  },
  curation: {
    label: "Curation",
    tone: "text-amber-100",
    pill: "border-amber-300/60 text-amber-100",
  },
  awaiting_guest: {
    label: "Awaiting Guest",
    tone: "text-cyan-100",
    pill: "border-cyan-300/60 text-cyan-100",
  },
  contract_out: {
    label: "Contract Out",
    tone: "text-purple-100",
    pill: "border-purple-300/60 text-purple-100",
  },
  confirmed: {
    label: "Confirmed",
    tone: "text-emerald-100",
    pill: "border-emerald-300/60 text-emerald-100",
  },
  tentative: {
    label: "Tentative",
    tone: "text-white/70",
    pill: "border-white/20 text-white/80",
  },
  cancelled: {
    label: "Cancelled",
    tone: "text-red-200",
    pill: "border-red-300/60 text-red-200",
  },
};

const TYPE_META: Record<EventKindToken, { label: string; tone: string }> = {
  buyout: { label: "Buyout", tone: "text-white" },
  large_party: { label: "Large Party", tone: "text-white/80" },
  internal: { label: "Internal", tone: "text-white/70" },
  vendor: { label: "Vendor", tone: "text-white/70" },
  unknown: { label: "Unclassified", tone: "text-white/60" },
};

const OPERATIONAL_TOGGLES: Array<{ key: OperationalRequirementKey; label: string }> = [
  { key: "requires_special_menu", label: "Requires special menu" },
  { key: "requires_extra_staff", label: "Needs extra staff" },
  { key: "kitchen_follow_up", label: "Kitchen follow-up" },
];

const NOTE_TYPES: Array<{ key: string; label: string }> = [
  { key: "kitchen", label: "Kitchen" },
  { key: "floor", label: "Floor" },
  { key: "bar", label: "Bar" },
  { key: "ops", label: "Ops" },
];

/**
 * Layout overview:
 * 1. Control header (breadcrumbs title + scope + filters) sits on the open star-field.
 * 2. Main grid splits into the left-hand date timeline and a right-hand operational detail panel.
 * 3. Timeline rows render directly on the field with light dividers; the detail panel stays sticky for quick scanning.
 */
export function EventsPageClient({ events }: EventsPageClientProps) {
  const [scope, setScope] = useState<DateScope>("week");
  const [statusFilter, setStatusFilter] = useState<Set<EventStatusToken>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<EventKindToken>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(() => events[0]?.id ?? null);
  const [eventsData, setEventsData] = useState<PrivateEvent[]>(events);
  const [surfaceState, setSurfaceState] = useState<EventsSurfaceState>("ready");
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ start: null, end: null });
  const [page, setPage] = useState(0);
  const hasCustomRange = Boolean(dateRange.start && dateRange.end);
  const activeRange = useMemo(() => {
    if (hasCustomRange && dateRange.start && dateRange.end) {
      return { start: dateRange.start, end: dateRange.end };
    }
    return computeScopeRange(scope);
  }, [dateRange.end, dateRange.start, hasCustomRange, scope]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function load() {
      setSurfaceState("loading");
      setSurfaceError(null);
      try {
        const params = new URLSearchParams({
          scope: hasCustomRange ? "custom" : scope,
          rangeStart: activeRange.start,
          rangeEnd: activeRange.end,
          limit: EVENTS_PAGE_SIZE.toString(),
          page: page.toString(),
        });
        if (statusFilter.size > 0) {
          params.set("status", Array.from(statusFilter).join(","));
        }
        if (typeFilter.size > 0) {
          params.set("type", Array.from(typeFilter).join(","));
        }
        const response = await fetch(`/api/staff/events?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to load events");
        }
        const payload = (await response.json()) as { events: PrivateEvent[] };
        if (!mounted) return;
        setEventsData(payload.events ?? []);
        setSurfaceState("ready");
      } catch (error) {
        if (!mounted || controller.signal.aborted) return;
        setSurfaceState("error");
        setSurfaceError(error instanceof Error ? error.message : "Unknown error");
      }
    }

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    scope,
    statusFilter,
    typeFilter,
    refreshCounter,
    hasCustomRange,
    activeRange.start,
    activeRange.end,
    page,
  ]);

  const groupedEvents = useMemo(() => buildTimelineGroups(eventsData), [eventsData]);
  const flattened = useMemo(
    () => groupedEvents.flatMap((group) => group.events),
    [groupedEvents],
  );
  const eventAssignments = useMemo(
    () => buildEventScheduleAssignments(flattened.slice(0, 6)),
    [flattened],
  );

  useEffect(() => {
    if (flattened.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !flattened.some((event) => event.id === selectedId)) {
      setSelectedId(flattened[0]?.id ?? null);
    }
  }, [flattened, selectedId]);

  const selectedContext = flattened.find((event) => event.id === selectedId) ?? null;

  const metrics = useMemo<Metric[]>(() => {
    const confirmedCount = eventsData.filter((event) => normalizeStatus(event.status) === "confirmed")
      .length;
    const awaitingCount = eventsData.filter(
      (event) => normalizeStatus(event.status) === "awaiting_guest",
    ).length;
    const rangeSummary = DATE_SCOPE_COPY[scope];
    const rangeLabel = hasCustomRange ? "Custom range" : rangeSummary.label;
    const rangeValue =
      hasCustomRange && dateRange.start && dateRange.end
        ? `${dateRange.start} → ${dateRange.end}`
        : rangeSummary.rangeCopy;
    return [
      { id: "events", label: "Events logged", value: eventsData.length.toString() },
      { id: "confirmed", label: "Locked", value: confirmedCount.toString(), caption: "Confirmed" },
      { id: "awaiting", label: "Awaiting guest", value: awaitingCount.toString() },
      { id: "range", label: rangeLabel, value: rangeValue },
    ];
  }, [dateRange.end, dateRange.start, eventsData, hasCustomRange, scope]);

  const statusOptions = useMemo(() => deriveStatusOptions(groupedEvents), [groupedEvents]);
  const typeOptions = useMemo(() => deriveTypeOptions(groupedEvents), [groupedEvents]);

  const toggleStatus = useCallback((value: EventStatusToken) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
    setPage(0);
  }, []);

  const toggleType = useCallback((value: EventKindToken) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
    setPage(0);
  }, []);

  const handleScopeChange = useCallback((nextScope: DateScope) => {
    setScope(nextScope);
    setPage(0);
  }, []);

  const handleDateRangeChange = useCallback((patch: Partial<DateRangeValue>) => {
    setDateRange((prev) => ({ ...prev, ...patch }));
    setPage(0);
  }, []);

  const resetDateRange = useCallback(() => {
    setDateRange({ start: null, end: null });
    setPage(0);
  }, []);

  const canGoPrev = page > 0;
  const canGoNext = eventsData.length === EVENTS_PAGE_SIZE;

  const handlePaginate = useCallback(
    (direction: "prev" | "next") => {
      setPage((prev) => {
        if (direction === "prev") {
          return Math.max(0, prev - 1);
        }
        if (direction === "next" && canGoNext) {
          return prev + 1;
        }
        return prev;
      });
    },
    [canGoNext],
  );

  const handleEventUpdated = useCallback(() => {
    setRefreshCounter((value) => value + 1);
  }, []);

  return (
    <div className="space-y-10">
      <EventsControlHeader
        scope={scope}
        onScopeChange={handleScopeChange}
        metrics={metrics}
        statusOptions={statusOptions}
        statusFilter={statusFilter}
        onStatusToggle={toggleStatus}
        typeOptions={typeOptions}
        typeFilter={typeFilter}
        onTypeToggle={toggleType}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onDateRangeReset={resetDateRange}
        page={page}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPaginate={handlePaginate}
      />

      {surfaceState === "loading" ? (
        <EventsLoadingState />
      ) : surfaceState === "error" ? (
        <EventsErrorState message={surfaceError} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2.15fr)_minmax(320px,0.85fr)]">
          <EventsTimeline groups={groupedEvents} selectedId={selectedId} onSelect={setSelectedId} />
          <EventDetailPanel context={selectedContext} onEventUpdated={handleEventUpdated} />
        </div>
      )}
      <section className="space-y-4 border-t border-white/10 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">Shared cadence</p>
            <h2 className="text-lg font-light text-white">Event staffing alignment</h2>
            <p className="text-sm text-white/60">
              The staff schedule grid renders the next event pulses so FOH + BOH can read the same timeline.
            </p>
          </div>
        </div>
        <ScheduleGrid
          assignments={eventAssignments}
          state={eventAssignments.length ? "ready" : "empty"}
        />
        <ScheduleLegend />
      </section>
    </div>
  );
}

function EventsControlHeader({
  scope,
  onScopeChange,
  metrics,
  statusOptions,
  statusFilter,
  onStatusToggle,
  typeOptions,
  typeFilter,
  onTypeToggle,
  dateRange,
  onDateRangeChange,
  onDateRangeReset,
  page,
  canGoPrev,
  canGoNext,
  onPaginate,
}: {
  scope: DateScope;
  onScopeChange: (scope: DateScope) => void;
  metrics: Metric[];
  statusOptions: FilterOption<EventStatusToken>[];
  statusFilter: Set<EventStatusToken>;
  onStatusToggle: (value: EventStatusToken) => void;
  typeOptions: FilterOption<EventKindToken>[];
  typeFilter: Set<EventKindToken>;
  onTypeToggle: (value: EventKindToken) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (patch: Partial<DateRangeValue>) => void;
  onDateRangeReset: () => void;
  page: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPaginate: (direction: "prev" | "next") => void;
}) {
  return (
    <section className="space-y-6 border-b border-white/10 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Staff · Events</p>
          <h1 className="text-2xl font-light tracking-[0.2em] text-white">Event Breadcrumbs</h1>
          <p className="max-w-2xl text-sm text-white/65">
            Mission-log view of every private ritual. Dates, time windows, status, and operational
            signals stay inline on the star field for quick reading.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 text-xs uppercase tracking-[0.3em] text-white/60">
          {(Object.keys(DATE_SCOPE_COPY) as DateScope[]).map((option) => (
            <ScopeButton
              key={option}
              label={DATE_SCOPE_COPY[option].label}
              active={scope === option}
              onClick={() => onScopeChange(option)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {metrics.map((metric) => (
          <MetricChip key={metric.id} metric={metric} />
        ))}
      </div>

      <DateRangeControls
        value={dateRange}
        onChange={onDateRangeChange}
        onReset={onDateRangeReset}
      />

      <div className="space-y-4">
        <FilterGroup
          label="Status"
          options={statusOptions}
          active={statusFilter}
          onToggle={(value) => onStatusToggle(value as EventStatusToken)}
          metaLookup={STATUS_META}
        />
        <FilterGroup
          label="Type"
          options={typeOptions}
          active={typeFilter}
          onToggle={(value) => onTypeToggle(value as EventKindToken)}
          metaLookup={TYPE_META}
        />
      </div>

      <PaginationControls
        page={page}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPaginate={onPaginate}
      />
    </section>
  );
}

function ScopeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1 text-[0.7rem] whitespace-nowrap ${
        active ? "bg-white text-black" : "text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function MetricChip({ metric }: { metric: Metric }) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-white/15 px-4 py-3">
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">{metric.label}</p>
      <p className="whitespace-nowrap text-lg text-white">{metric.value}</p>
      {metric.caption && <p className="text-xs text-white/60">{metric.caption}</p>}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onToggle,
  metaLookup,
}: {
  label: string;
  options: FilterOption<T>[];
  active: Set<T>;
  onToggle: (value: T) => void;
  metaLookup: Record<string, { label: string; tone?: string }>;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option.key}
            label={metaLookup[option.key]?.label ?? option.key}
            value={option.key}
            count={option.count}
            active={active.has(option.key)}
            onToggle={onToggle}
            toneClass={metaLookup[option.key]?.tone}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip<T extends string>({
  label,
  value,
  count,
  active,
  onToggle,
  toneClass,
}: {
  label: string;
  value: T;
  count: number;
  active: boolean;
  onToggle: (value: T) => void;
  toneClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
        active ? "border-white/80 bg-white/10 text-white" : "border-white/15 text-white/60 hover:text-white"
      }`}
    >
      <span className={`truncate ${toneClass ?? ""}`}>{label}</span>
      <span className="text-white/40">{count}</span>
    </button>
  );
}

function DateRangeControls({
  value,
  onChange,
  onReset,
}: {
  value: DateRangeValue;
  onChange: (patch: Partial<DateRangeValue>) => void;
  onReset: () => void;
}) {
  const hasRange = Boolean(value.start || value.end);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
        Start
        <input
          type="date"
          value={value.start ?? ""}
          onChange={(event) => onChange({ start: event.target.value || null })}
          className="mt-1 w-full rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
        End
        <input
          type="date"
          value={value.end ?? ""}
          onChange={(event) => onChange({ end: event.target.value || null })}
          className="mt-1 w-full rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="button"
        onClick={onReset}
        disabled={!hasRange}
        className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 disabled:opacity-40"
      >
        Reset range
      </button>
    </div>
  );
}

function PaginationControls({
  page,
  canGoPrev,
  canGoNext,
  onPaginate,
}: {
  page: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPaginate: (direction: "prev" | "next") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.35em] text-white/50">
      <span>Page {page + 1}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPaginate("prev")}
          disabled={!canGoPrev}
          className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] text-white/70 hover:border-white/50 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPaginate("next")}
          disabled={!canGoNext}
          className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] text-white/70 hover:border-white/50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function EventsTimeline({
  groups,
  selectedId,
  onSelect,
}: {
  groups: TimelineGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (groups.length === 0) {
    return <EventsEmptyState />;
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.dateKey} className="space-y-4">
          <header className="flex flex-wrap items-baseline gap-3 text-xs uppercase tracking-[0.4em] text-white/40">
            <span className="whitespace-nowrap">{group.weekday}</span>
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/60">{group.dateLabel}</span>
          </header>

          <div className="space-y-3">
            {group.events.map((event) => {
              const isActive = selectedId === event.id;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelect(event.id)}
                  className={`relative w-full rounded-[28px] border px-5 py-4 text-left transition ${
                    isActive
                      ? "border-white/80 bg-white/5 shadow-[0_0_35px_rgba(255,255,255,0.15)]"
                      : "border-white/15 bg-transparent hover:border-white/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.35em] text-white/50">
                    <span className="whitespace-nowrap">{event.timeLabel}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] ${STATUS_META[event.status].pill}`}>
                      {STATUS_META[event.status].label}
                    </span>
                    <span className="truncate text-white/50">{TYPE_META[event.type].label}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-base font-medium tracking-wide text-white whitespace-nowrap truncate">
                      {event.title}
                    </p>
                    {event.headcount !== null && (
                      <span className="text-sm text-white/60 whitespace-nowrap">
                        · {event.headcount} guests
                      </span>
                    )}
                  </div>
                  {event.subtitle && (
                    <p className="text-sm text-white/60 whitespace-nowrap truncate">{event.subtitle}</p>
                  )}
                  {event.notes && (
                    <p className="mt-2 text-sm text-white/60 hyphens-auto">
                      {event.notes}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function EventDetailPanel({
  context,
  onEventUpdated,
}: {
  context: TimelineEvent | null;
  onEventUpdated: () => void;
}) {
  const event = context?.raw ?? null;
  const [timeForm, setTimeForm] = useState({ start: "", end: "" });
  const [statusValue, setStatusValue] = useState<string>("inquiry");
  const [headcountValue, setHeadcountValue] = useState<string>("");
  const [opsState, setOpsState] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [notesState, setNotesState] = useState<EventsSurfaceState>("loading");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({ type: "kitchen", body: "" });
  const [savingSection, setSavingSection] = useState<null | "time" | "status" | "ops" | "note">(null);
  const [feedback, setFeedback] = useState<{ section: "time" | "status" | "ops" | "note"; status: "success" | "error"; message: string } | null>(null);
  const [noteRefreshKey, setNoteRefreshKey] = useState(0);

  useEffect(() => {
    if (!event) return;
    setTimeForm({
      start: toTimeInput(event.start_time),
      end: toTimeInput(event.end_time),
    });
    setStatusValue(event.status ?? "inquiry");
    setHeadcountValue(
      typeof event.party_size === "number" ? String(event.party_size) : "",
    );
    setOpsState(event.operational_requirements ?? {});
    setFeedback(null);
    setNoteForm({ type: "kitchen", body: "" });
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!event) return;
    let active = true;
    setNotesState("loading");
    setNotesError(null);
    fetchEventNotes(event.id)
      .then((data) => {
        if (!active) return;
        setNotes(data);
        setNotesState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotesState("error");
        setNotesError(error instanceof Error ? error.message : "Failed to load notes");
      });
    return () => {
      active = false;
    };
  }, [event?.id, noteRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event || !context) {
    return (
      <aside className="rounded-[32px] border border-dashed border-white/20 p-6 text-sm text-white/60">
        No events match the current filters. Adjust the scope or filters to load the next breadcrumb
        set.
      </aside>
    );
  }

  const currentEvent = event as NonNullable<typeof event>;
  const currentContext = context as NonNullable<typeof context>;

  async function handleTimeSave() {
    setSavingSection("time");
    setFeedback(null);
    try {
      await updateEvent(currentEvent.id, {
        start_time: timeForm.start || null,
        end_time: timeForm.end || null,
      });
      setFeedback({ section: "time", status: "success", message: "Time window updated" });
      onEventUpdated();
      toast.success("Time window updated");
    } catch (error) {
      setFeedback({
        section: "time",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update time window",
      });
      toast.error(error instanceof Error ? error.message : "Failed to update time window");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleStatusSave() {
    setSavingSection("status");
    setFeedback(null);
    const parsedSize =
      headcountValue.trim() === "" ? null : Number.parseInt(headcountValue, 10);
    if (parsedSize !== null && Number.isNaN(parsedSize)) {
      setFeedback({
        section: "status",
        status: "error",
        message: "Headcount must be a number",
      });
      setSavingSection(null);
      return;
    }
    try {
      await updateEvent(currentEvent.id, {
        party_size: parsedSize,
        status: statusValue.trim(),
      });
      setFeedback({ section: "status", status: "success", message: "Headcount & status saved" });
      onEventUpdated();
      toast.success("Headcount & status saved");
    } catch (error) {
      setFeedback({
        section: "status",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to save changes",
      });
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleOperationalToggle(key: OperationalRequirementKey) {
    const previous = { ...opsState };
    const next = { ...opsState, [key]: !opsState[key] };
    setOpsState(next);
    setSavingSection("ops");
    setFeedback(null);
    try {
      await updateEvent(currentEvent.id, {
        operational_requirements: next,
      });
      setFeedback({ section: "ops", status: "success", message: "Operational tags updated" });
      onEventUpdated();
      toast.success("Operational tags updated");
    } catch (error) {
      setOpsState(previous);
      setFeedback({
        section: "ops",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update tag",
      });
      toast.error(error instanceof Error ? error.message : "Failed to update tag");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleNoteSubmit() {
    if (!noteForm.body.trim()) {
      setFeedback({
        section: "note",
        status: "error",
        message: "Add note details before sending",
      });
      return;
    }
    setSavingSection("note");
    setFeedback(null);
    try {
      await createEventNote(currentEvent.id, noteForm.body.trim(), noteForm.type);
      setNoteForm((prev) => ({ ...prev, body: "" }));
      setNoteRefreshKey((value) => value + 1);
      setFeedback({ section: "note", status: "success", message: "Note logged" });
      toast.success("Note logged");
    } catch (error) {
      setFeedback({
        section: "note",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to log note",
      });
      toast.error(error instanceof Error ? error.message : "Failed to log note");
    } finally {
      setSavingSection(null);
    }
  }

  return (
    <aside className="rounded-[32px] border border-white/15 bg-white/5 p-6 backdrop-blur-md lg:sticky lg:top-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{currentContext.dateLabel}</p>
        <h2 className="text-xl font-light tracking-[0.2em] text-white whitespace-nowrap truncate">
          {currentContext.title}
        </h2>
        {currentContext.subtitle && (
          <p className="text-sm text-white/60 whitespace-nowrap truncate">{currentContext.subtitle}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.55rem] uppercase tracking-[0.35em] text-white/50">
          <Link
            href={`/staff/reflection?eventId=${currentContext.id}`}
            className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/60"
          >
            View reflections
          </Link>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm text-white/70">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/40">Time</dt>
          <dd className="whitespace-nowrap">{currentContext.timeLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/40">Status</dt>
          <dd className={`${STATUS_META[currentContext.status].tone} whitespace-nowrap`}>
            {STATUS_META[currentContext.status].label}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/40">Headcount</dt>
          <dd className="whitespace-nowrap">{currentContext.headcount ?? "TBD"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/40">Budget</dt>
          <dd className="whitespace-nowrap">{currentContext.budgetRange ?? "Custom"}</dd>
        </div>
        {currentContext.location && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/40">Menu / Room</dt>
            <dd className="truncate">{currentContext.location}</dd>
          </div>
        )}
        {currentContext.contactEmail && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/40">Contact</dt>
            <dd className="truncate">{currentContext.contactEmail}</dd>
          </div>
        )}
      </dl>

      <section className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Time window</span>
            <button
              type="button"
              onClick={handleTimeSave}
              disabled={savingSection === "time"}
              className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] text-white/80 hover:border-white/60 disabled:opacity-60"
            >
              {savingSection === "time" ? "Saving…" : "Save"}
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/50">
              Start
              <input
                type="time"
                value={timeForm.start}
                onChange={(event) => setTimeForm((prev) => ({ ...prev, start: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              End
              <input
                type="time"
                value={timeForm.end}
                onChange={(event) => setTimeForm((prev) => ({ ...prev, end: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              />
            </label>
          </div>
          {feedback?.section === "time" && (
            <p
              className={`mt-2 text-xs ${
                feedback.status === "success" ? "text-emerald-200" : "text-red-300"
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Headcount & status</span>
            <button
              type="button"
              onClick={handleStatusSave}
              disabled={savingSection === "status"}
              className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] text-white/80 hover:border-white/60 disabled:opacity-60"
            >
              {savingSection === "status" ? "Saving…" : "Save"}
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <label className="text-xs text-white/50">
              Headcount
              <input
                type="number"
                min={0}
                value={headcountValue}
                onChange={(event) => setHeadcountValue(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-white/50">
              Status
              <select
                value={statusValue}
                onChange={(event) => setStatusValue(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status} className="bg-black">
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {feedback?.section === "status" && (
            <p
              className={`mt-2 text-xs ${
                feedback.status === "success" ? "text-emerald-200" : "text-red-300"
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Operational tags</p>
        <div className="space-y-2 text-sm text-white/70">
          {OPERATIONAL_TOGGLES.map((toggle) => {
            const active = Boolean(opsState[toggle.key]);
            return (
              <button
                key={toggle.key}
                type="button"
                onClick={() => handleOperationalToggle(toggle.key)}
                disabled={savingSection === "ops"}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 ${
                  active
                    ? "border-emerald-400/50 bg-emerald-400/10 text-white"
                    : "border-white/15 text-white/70 hover:border-white/40"
                }`}
              >
                <span className="truncate">{toggle.label}</span>
                <span className="text-xs uppercase tracking-[0.3em]">
                  {active ? "Active" : "Idle"}
                </span>
              </button>
            );
          })}
        </div>
        {feedback?.section === "ops" && (
          <p
            className={`text-xs ${
              feedback.status === "success" ? "text-emerald-200" : "text-red-300"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
          <span>Notes</span>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/15 bg-black/30 p-3 text-sm text-white/80">
          {notesState === "loading" ? (
            <p className="text-white/50">Loading notes…</p>
          ) : notesState === "error" ? (
            <p className="text-red-300">{notesError ?? "Unable to load notes."}</p>
          ) : notes.length === 0 ? (
            <p className="text-white/50">No operator notes logged yet.</p>
          ) : (
            notes.map((note) => (
              <article key={note.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
                  <span>{note.note_type ?? "general"}</span>
                  <span>{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-white/80">{note.body}</p>
              </article>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,140px)_1fr]">
            <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
              Channel
              <select
                value={noteForm.type}
                onChange={(event) => setNoteForm((prev) => ({ ...prev, type: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              >
                {NOTE_TYPES.map((option) => (
                  <option key={option.key} value={option.key} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
              Note
              <textarea
                value={noteForm.body}
                onChange={(event) => setNoteForm((prev) => ({ ...prev, body: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                placeholder="Kitchen / floor / bar signals…"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleNoteSubmit}
            disabled={savingSection === "note"}
            className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/80 hover:border-white/60 disabled:opacity-60"
          >
            {savingSection === "note" ? "Logging…" : "Log note"}
          </button>
          {feedback?.section === "note" && (
            <p
              className={`mt-2 text-xs ${
                feedback.status === "success" ? "text-emerald-200" : "text-red-300"
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function EventsEmptyState() {
  return (
    <div className="rounded-[32px] border border-dashed border-white/20 p-8 text-center text-sm text-white/60">
      No events within this view. Adjust the date scope or remove filters to reload the stream of
      breadcrumbs.
    </div>
  );
}

function EventsLoadingState() {
  return (
    <div className="grid animate-pulse gap-10 lg:grid-cols-[minmax(0,2.15fr)_minmax(320px,0.85fr)]">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="h-3 w-32 rounded bg-white/20" />
            <div className="mt-3 h-4 w-64 rounded bg-white/20" />
            <div className="mt-2 h-3 w-48 rounded bg-white/10" />
          </div>
        ))}
      </div>
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="h-4 w-40 rounded bg-white/20" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-3 w-full rounded bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsErrorState({ message }: { message?: string | null }) {
  return (
    <div className="rounded-[32px] border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-100">
      Could not fetch the events stream. Retry shortly or verify Supabase credentials.
      {message && <p className="mt-2 text-red-200/90">{message}</p>}
    </div>
  );
}

function buildTimelineGroups(events: PrivateEvent[]): TimelineGroup[] {
  const byKey = new Map<string, TimelineGroup>();
  const sorted = [...events].sort((a, b) => {
    const aTime = getEventDate(a).getTime();
    const bTime = getEventDate(b).getTime();
    return aTime - bTime;
  });

  sorted.forEach((event) => {
    const date = getEventDate(event);
    const dateKey = getDateKey(date);
    if (!byKey.has(dateKey)) {
      byKey.set(dateKey, {
        dateKey,
        dateLabel: formatDisplayDate(date),
        weekday: formatWeekday(date),
        events: [],
      });
    }
    const group = byKey.get(dateKey);
    if (!group) return;
    group.events.push({
      id: event.id,
      title: event.guest_name ?? event.organization ?? "Unassigned Experience",
      subtitle: event.organization,
      status: normalizeStatus(event.status),
      type: normalizeType(event.event_type),
      headcount: event.party_size ?? null,
      dateLabel: group.dateLabel,
      weekday: group.weekday,
      timeLabel: formatTimeWindow(event.preferred_date, event.start_time, event.end_time),
      budgetRange: event.budget_range ?? null,
      contactName: event.guest_name ?? null,
      contactEmail: event.guest_email ?? null,
      notes: event.special_requests ?? event.proposal_text ?? event.notes_internal ?? null,
      location: event.menu_style ?? null,
      startTime: event.start_time ?? null,
      endTime: event.end_time ?? null,
      operationalRequirements: event.operational_requirements ?? null,
      raw: event,
    });
  });

  return Array.from(byKey.values());
}

function deriveStatusOptions(groups: TimelineGroup[]): FilterOption<EventStatusToken>[] {
  const counts: Record<EventStatusToken, number> = {
    inquiry: 0,
    curation: 0,
    awaiting_guest: 0,
    contract_out: 0,
    confirmed: 0,
    tentative: 0,
    cancelled: 0,
  };

  groups.forEach((group) => {
    group.events.forEach((event) => {
      counts[event.status] += 1;
    });
  });

  return STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => ({
    key: status,
    count: counts[status],
  }));
}

function deriveTypeOptions(groups: TimelineGroup[]): FilterOption<EventKindToken>[] {
  const counts: Record<EventKindToken, number> = {
    buyout: 0,
    large_party: 0,
    internal: 0,
    vendor: 0,
    unknown: 0,
  };

  groups.forEach((group) => {
    group.events.forEach((event) => {
      counts[event.type] += 1;
    });
  });

  return TYPE_ORDER.filter((type) => counts[type] > 0).map((type) => ({
    key: type,
    count: counts[type],
  }));
}

function normalizeStatus(status?: string | null): EventStatusToken {
  switch (status) {
    case "curation":
    case "menu_curation":
      return "curation";
    case "awaiting_guest":
    case "proposal_sent":
      return "awaiting_guest";
    case "contract_out":
    case "contract_sent":
    case "contract_signed":
      return "contract_out";
    case "confirmed":
    case "deposit_paid":
    case "completed":
      return "confirmed";
    case "tentative":
      return "tentative";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "inquiry";
  }
}

function normalizeType(value?: string | null): EventKindToken {
  if (!value) return "unknown";
  const copy = value.toLowerCase();
  if (copy.includes("buyout")) return "buyout";
  if (copy.includes("large") || copy.includes("party")) return "large_party";
  if (copy.includes("internal")) return "internal";
  if (copy.includes("vendor") || copy.includes("partner")) return "vendor";
  return "unknown";
}

function getEventDate(event: PrivateEvent) {
  const source = event.preferred_date ?? event.created_at ?? new Date().toISOString();
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function formatDisplayDate(date: Date) {
  return dateFormatter.format(date);
}

function formatWeekday(date: Date) {
  return weekdayFormatter.format(date);
}

function formatTimeWindow(preferredDate?: string | null, startTime?: string | null, endTime?: string | null) {
  const start = formatTime(preferredDate, startTime);
  const end = formatTime(preferredDate, endTime);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "Time TBD";
}

function formatTime(preferredDate?: string | null, time?: string | null) {
  if (!time) return null;
  const isoSource = preferredDate ? `${preferredDate}T${time}` : time;
  const parsed = new Date(isoSource);
  if (!Number.isNaN(parsed.getTime())) {
    return timeFormatter.format(parsed);
  }

  const timeParts = time.split(":");
  if (timeParts.length >= 2) {
    const date = preferredDate ? new Date(preferredDate) : new Date();
    date.setHours(Number(timeParts[0]) || 0, Number(timeParts[1]) || 0, 0, 0);
    if (!Number.isNaN(date.getTime())) {
      return timeFormatter.format(date);
    }
  }

  return time;
}

function toTimeInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

async function updateEvent(eventId: string, payload: UpdateEventPayload) {
  const response = await fetch(`/api/staff/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update event");
  }
  return (await response.json()) as { event: PrivateEvent };
}

async function fetchEventNotes(eventId: string) {
  const response = await fetch(`/api/staff/events/${eventId}/notes`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to load notes");
  }
  const payload = (await response.json()) as { notes: EventNote[] };
  return payload.notes ?? [];
}

async function createEventNote(eventId: string, body: string, noteType: string) {
  const response = await fetch(`/api/staff/events/${eventId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, note_type: noteType }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to log note");
  }
}

function computeScopeRange(scope: DateScope) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  if (scope === "day") {
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (scope === "week") {
    end.setUTCDate(end.getUTCDate() + 7);
  } else {
    end.setUTCDate(end.getUTCDate() + 30);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function buildEventScheduleAssignments(events: TimelineEvent[]): ScheduleAssignment[] {
  return events.map((event, index) => {
    const fallbackStart = 15 + (index % 5) * 2;
    const start = formatEventScheduleTime(event.startTime, event.raw.preferred_date, fallbackStart);
    const end = formatEventScheduleTime(event.endTime, event.raw.preferred_date, fallbackStart + 2);
    return {
      id: `event-schedule-${event.id}`,
      staffId: null,
      staffName: event.title,
      staffRole: event.subtitle ?? undefined,
      focus: eventTypeToFocus(event.type),
      station: event.location ?? event.type,
      role: STATUS_META[event.status]?.label ?? event.status,
      start,
      end,
      note: event.notes ?? event.dateLabel,
      status: eventStatusToShiftStatus(event.status),
    };
  });
}

function eventTypeToFocus(type: EventKindToken): ShiftFocus {
  switch (type) {
    case "buyout":
    case "large_party":
      return "guest";
    case "vendor":
      return "ops";
    case "internal":
      return "service";
    default:
      return "guest";
  }
}

function eventStatusToShiftStatus(status: EventStatusToken): ShiftStatus {
  if (status === "confirmed" || status === "contract_out") return "confirmed";
  if (status === "tentative" || status === "awaiting_guest" || status === "curation") return "tentative";
  return "open";
}

function formatEventScheduleTime(value?: string | null, preferredDate?: string | null, fallbackHour = 18) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
    }
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }
    if (preferredDate) {
      const derived = new Date(`${preferredDate.slice(0, 10)}T${value}`);
      if (!Number.isNaN(derived.getTime())) {
        return `${String(derived.getHours()).padStart(2, "0")}:${String(derived.getMinutes()).padStart(2, "0")}`;
      }
    }
  }
  const normalized = ((fallbackHour % 24) + 24) % 24;
  return `${String(normalized).padStart(2, "0")}:00`;
}
