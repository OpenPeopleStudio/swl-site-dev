"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SHIFT_FOCUS_ORDER,
  type ScheduleAssignment,
  type ScheduleLoadArgs,
  type SchedulePayload,
  type ScheduleState,
  type ScheduleSummary,
  type ShiftComposerServerPayload,
  type ShiftFocus,
  type ShiftStatus,
  type StaffOption,
} from "@/domains/staff/schedule/types";
import { ScheduleGrid, ScheduleLegend } from "@/components/staff/ScheduleGrid";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

type ScheduleConsoleProps = {
  initialDateISO: string;
  initialFocus?: ShiftFocus;
  initialStaffIds?: string[];
  initialData: SchedulePayload;
  initialDateFromQuery: boolean;
  initialTimezone?: string | null;
  initialHighlightId?: string | null;
  loadScheduleAction: (args: ScheduleLoadArgs) => Promise<SchedulePayload>;
  createShiftAction: (payload: ShiftComposerServerPayload) => Promise<void>;
  updateShiftAction: (payload: ShiftComposerServerPayload & { id: string }) => Promise<void>;
  saveTimezonePreference: (timezone: string) => Promise<void>;
};

type ShiftComposerForm = {
  id?: string;
  staffId: string;
  focus: ShiftFocus;
  role: string;
  station: string;
  start: string;
  end: string;
  status: ShiftStatus;
  note: string;
};

type ComposerMode = "create" | "edit";

export function ScheduleConsole({
  initialDateISO,
  initialFocus,
  initialStaffIds,
  initialData,
  initialDateFromQuery,
  initialTimezone = null,
  initialHighlightId = null,
  loadScheduleAction,
  createShiftAction,
  updateShiftAction,
  saveTimezonePreference,
}: ScheduleConsoleProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [referenceDate, setReferenceDate] = useState(() => parseDateOnly(initialDateISO));
  const [focusFilter, setFocusFilter] = useState<ShiftFocus | "all">(initialFocus ?? "all");
  const [staffFilters, setStaffFilters] = useState<string[]>(initialStaffIds ?? []);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>(initialData.assignments);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>(initialData.staffOptions);
  const [focusOptions, setFocusOptions] = useState<ShiftFocus[]>(initialData.focusOptions);
  const [scheduleState, setScheduleState] = useState<ScheduleState>(initialData.state);
  const [highlightedId, setHighlightedId] = useState<string | null>(initialHighlightId);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<string[]>(initialStaffIds ?? []);
  const [composerState, setComposerState] = useState<{ open: boolean; mode: ComposerMode; form: ShiftComposerForm }>({
    open: false,
    mode: "create",
    form: createEmptyForm(initialData, initialStaffIds),
  });
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isComposerSubmitting, setComposerSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [viewerTimezone, setViewerTimezone] = useState(initialTimezone ?? getBrowserTimezone);
  const [savedPreset, setSavedPreset] = useState<string[]>(() => loadFilterPreset());
  const viewStateRef = useRef({
    referenceDate,
    focusFilter,
    staffFilters,
  });

  const summary = useMemo(() => buildScheduleSummary(assignments), [assignments]);
  const orderedFocusPills = useMemo(() => {
    const activeFocus = new Set(focusOptions);
    return ["all", ...SHIFT_FOCUS_ORDER.filter((focus) => activeFocus.has(focus))] as Array<ShiftFocus | "all">;
  }, [focusOptions]);

  const refreshSchedule = useCallback(
    (nextDate: Date, nextFocus: ShiftFocus | "all", nextStaffIds: string[], options: { silent?: boolean; nextTimezone?: string } = {}) => {
      const effectiveTimezone = options.nextTimezone ?? viewerTimezone;
      const [windowStartIso, windowEndIso] = buildWindowBoundaries(nextDate);
      const args: ScheduleLoadArgs = {
        date: formatDateKey(nextDate),
        focus: nextFocus === "all" ? undefined : nextFocus,
        staffIds: nextStaffIds.length ? nextStaffIds : undefined,
        timezone: effectiveTimezone,
        windowStartIso,
        windowEndIso,
      };

      startTransition(() => {
        if (!options.silent) {
          setScheduleState("loading");
        }
        loadScheduleAction(args)
          .then((payload) => {
            setAssignments(payload.assignments);
            setStaffOptions(payload.staffOptions);
            setFocusOptions(payload.focusOptions);
            setScheduleState(payload.state);
          })
          .catch((error) => {
            console.error("loadScheduleAction error", error);
            setScheduleState("error");
          });
      });
    },
    [viewerTimezone, loadScheduleAction],
  );

  const handlePresetSave = useCallback(
    (ids: string[]) => {
      setSavedPreset(ids);
      persistFilterPreset(ids);
    },
    [],
  );

  const handlePresetClear = useCallback(() => {
    setSavedPreset([]);
    persistFilterPreset([]);
  }, []);

  const handlePresetApply = useCallback(() => {
    if (!savedPreset.length) return;
    setFilterDraft(savedPreset);
  }, [savedPreset]);

  useEffect(() => {
    setFilterDraft(staffFilters);
  }, [staffFilters]);

  useEffect(() => {
    viewStateRef.current = {
      referenceDate,
      focusFilter,
      staffFilters,
    };
  }, [referenceDate, focusFilter, staffFilters]);

  const syncQueryParams = useCallback(
    (nextDate: Date, nextFocus: ShiftFocus | "all", nextStaffIds: string[]) => {
      const params = new URLSearchParams();
      params.set("date", formatDateKey(nextDate));
      if (nextFocus !== "all") {
        params.set("focus", nextFocus);
      }
      if (nextStaffIds.length) {
        params.set("staff", nextStaffIds.join(","));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    if (initialTimezone) {
      return;
    }
    const detected = getBrowserTimezone();
    if (detected !== viewerTimezone) {
      setViewerTimezone(detected);
      refreshSchedule(referenceDate, focusFilter, staffFilters, { silent: true, nextTimezone: detected });
      void saveTimezonePreference(detected);
    }
  }, [initialTimezone, viewerTimezone, referenceDate, focusFilter, staffFilters, refreshSchedule, saveTimezonePreference]);

  useEffect(() => {
    if (initialDateFromQuery) {
      return;
    }
    const localToday = formatDateKey(new Date());
    if (localToday !== initialDateISO) {
      const nextDate = parseDateOnly(localToday);
      setReferenceDate(nextDate);
      syncQueryParams(nextDate, focusFilter, staffFilters);
      refreshSchedule(nextDate, focusFilter, staffFilters, { nextTimezone: viewerTimezone });
    }
  }, [initialDateFromQuery, initialDateISO, focusFilter, staffFilters, viewerTimezone, refreshSchedule, syncQueryParams]);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("staff-schedule-grid")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_schedule" },
        () => {
          const snapshot = viewStateRef.current;
          refreshSchedule(snapshot.referenceDate, snapshot.focusFilter, snapshot.staffFilters, { silent: true });
        },
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [refreshSchedule]);

  function handleNavigate(delta: number) {
    const nextDate = moveDate(referenceDate, delta);
    setReferenceDate(nextDate);
    syncQueryParams(nextDate, focusFilter, staffFilters);
    refreshSchedule(nextDate, focusFilter, staffFilters);
  }

  function handleFocusChange(nextFocus: ShiftFocus | "all") {
    setFocusFilter(nextFocus);
    syncQueryParams(referenceDate, nextFocus, staffFilters);
    refreshSchedule(referenceDate, nextFocus, staffFilters);
  }

  function openComposer(mode: ComposerMode, assignment?: ScheduleAssignment) {
    const focusPalette = focusOptions.length ? focusOptions : SHIFT_FOCUS_ORDER;
    const baseForm = assignment ? mapAssignmentToForm(assignment) : createDefaultForm(staffOptions, focusPalette);
    setComposerState({ open: true, mode, form: baseForm });
    setComposerError(null);
  }

  function closeComposer() {
    setComposerState((prev) => ({ ...prev, open: false }));
  }

  async function submitComposer() {
    if (!composerState.form.staffId) return;
    const form = composerState.form;
    const [startIso, endIso] = buildShiftBoundaries(referenceDate, form.start, form.end);
    const payload: ShiftComposerServerPayload = {
      staffId: form.staffId,
      focus: form.focus,
      role: form.role.trim(),
      station: form.station.trim(),
      status: form.status,
      note: form.note.trim() || undefined,
      startIso,
      endIso,
    };

    setComposerSubmitting(true);
    setComposerError(null);
    try {
      if (composerState.mode === "create") {
        await createShiftAction(payload);
      } else if (form.id) {
        await updateShiftAction({ ...payload, id: form.id });
      }
      closeComposer();
      refreshSchedule(referenceDate, focusFilter, staffFilters);
    } catch (error) {
      console.error("shift composer error", error);
      setComposerError(error instanceof Error ? error.message : "Unable to save shift");
    } finally {
      setComposerSubmitting(false);
    }
  }

  const disableAddShift = staffOptions.length === 0;

  return (
    <section
      className="w-full max-w-6xl text-white"
      aria-busy={isPending}
    >
      <ScheduleHeader
        date={referenceDate}
        summary={summary}
        onPrev={() => handleNavigate(-1)}
        onNext={() => handleNavigate(1)}
        pending={isPending}
      />

      <ScheduleControls
        focusOptions={orderedFocusPills}
        activeFocus={focusFilter}
        onFocusChange={handleFocusChange}
        onOpenFilters={() => setFilterOpen(true)}
        onAddShift={() => openComposer("create")}
        disableAdd={disableAddShift}
      />

      <ScheduleGrid
        assignments={assignments}
        state={scheduleState}
        highlightedId={highlightedId}
        onHighlight={setHighlightedId}
        onEditShift={(assignment) => openComposer("edit", assignment)}
      />

      <ScheduleLegend />

      <FilterDrawer
        open={isFilterOpen}
        staffOptions={staffOptions}
        selectedStaffIds={filterDraft}
        presetCount={savedPreset.length}
        onClose={() => {
          setFilterOpen(false);
          setFilterDraft(staffFilters);
        }}
        onToggle={(staffId) => {
          setFilterDraft((prev) =>
            prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
          );
        }}
        onApply={() => {
          setStaffFilters(filterDraft);
          setFilterOpen(false);
          syncQueryParams(referenceDate, focusFilter, filterDraft);
          refreshSchedule(referenceDate, focusFilter, filterDraft);
        }}
        onClear={() => setFilterDraft([])}
        onPresetSave={() => handlePresetSave(filterDraft)}
        onPresetApply={handlePresetApply}
        onPresetClear={handlePresetClear}
      />

      <ShiftComposerDialog
        open={composerState.open}
        mode={composerState.mode}
        form={composerState.form}
        staffOptions={staffOptions}
        focusOptions={focusOptions.length ? focusOptions : SHIFT_FOCUS_ORDER}
        onClose={closeComposer}
        onChange={(field, value) =>
          setComposerState((prev) => ({
            ...prev,
            form: { ...prev.form, [field]: value },
          }))
        }
        onSubmit={submitComposer}
        isSubmitting={isComposerSubmitting}
        error={composerError}
      />
    </section>
  );
}

function ScheduleHeader({
  date,
  summary,
  onPrev,
  onNext,
  pending,
}: {
  date: Date;
  summary: ScheduleSummary;
  onPrev: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <header className="mb-6 border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">Staff Schedule</p>
          <h1 className="text-2xl font-light tracking-tight text-white">{formatDateHeading(date)}</h1>
          <p className="text-xs text-white/60">
            {summary.windowLabel} · {summary.coverageLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.35em] text-white/70">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full border border-white/20 px-4 py-1 transition hover:border-white/50 disabled:opacity-50"
            aria-label="View previous day"
            disabled={pending}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full border border-white/20 px-4 py-1 transition hover:border-white/50 disabled:opacity-50"
            aria-label="View next day"
            disabled={pending}
          >
            Next
          </button>
        </div>
      </div>

      <dl className="mt-4 grid gap-4 text-xs text-white/60 sm:grid-cols-3">
        <SummaryCell label="Crew on" value={summary.crewCount.toString()} />
        <SummaryCell label="Window" value={summary.windowLabel} />
        <SummaryCell label="Coverage" value={summary.coverageLabel} />
      </dl>
    </header>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/15 pt-3">
      <dt className="uppercase tracking-[0.35em] text-white/40">{label}</dt>
      <dd className="mt-1 text-white">{value}</dd>
    </div>
  );
}

function ScheduleControls({
  focusOptions,
  activeFocus,
  onFocusChange,
  onOpenFilters,
  onAddShift,
  disableAdd,
}: {
  focusOptions: Array<ShiftFocus | "all">;
  activeFocus: ShiftFocus | "all";
  onFocusChange: (focus: ShiftFocus | "all") => void;
  onOpenFilters: () => void;
  onAddShift: () => void;
  disableAdd: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex flex-wrap gap-2">
        {focusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFocusChange(option)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.35em] ${
              activeFocus === option ? "border-white/70 text-white" : "border-white/20 text-white/60 hover:border-white/40"
            }`}
          >
            {option === "all" ? "All focus" : option}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.35em] text-white/70">
        <button
          type="button"
          onClick={onOpenFilters}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-white/50"
        >
          Filter
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-white/50 disabled:opacity-40"
          onClick={onAddShift}
          disabled={disableAdd}
        >
          Add shift
        </button>
      </div>
    </div>
  );
}

function FilterDrawer({
  open,
  staffOptions,
  selectedStaffIds,
  presetCount,
  onToggle,
  onApply,
  onClear,
  onClose,
  onPresetSave,
  onPresetApply,
  onPresetClear,
}: {
  open: boolean;
  staffOptions: StaffOption[];
  selectedStaffIds: string[];
  presetCount: number;
  onToggle: (id: string) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
  onPresetSave: () => void;
  onPresetApply: () => void;
  onPresetClear: () => void;
}) {
  if (!open) return null;

  const grouped = buildStaffGroups(staffOptions);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div className="h-full w-full max-w-md border-l border-white/10 bg-black/90 px-6 py-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">Filters</p>
            <h2 className="text-lg font-light text-white">Crew + roles</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70"
          >
            Close
          </button>
        </header>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/45">Preset</p>
              <p className="text-sm text-white">
                {presetCount > 0 ? `${presetCount} crew stored` : "No preset saved"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.35em]">
              <button
                type="button"
                onClick={onPresetSave}
                className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onPresetApply}
                className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/50 disabled:opacity-40"
                disabled={presetCount === 0}
              >
                Apply
              </button>
              {presetCount > 0 && (
                <button
                  type="button"
                  onClick={onPresetClear}
                  className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6 overflow-y-auto pb-28">
          {Object.entries(grouped).map(([groupKey, members]) => (
            <div key={groupKey} className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">
                {FOCUS_LABELS[groupKey as ShiftFocus | "other"] ?? "Unassigned"}
              </p>
              <div className="space-y-3">
                {members.map((staff) => {
                  const active = selectedStaffIds.includes(staff.id);
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => onToggle(staff.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-white/70 bg-white/10" : "border-white/15 bg-white/0 text-white/70 hover:border-white/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{staff.name}</p>
                          {staff.defaultRole && <p className="text-xs text-white/50">{staff.defaultRole}</p>}
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.35em]">{active ? "On" : "Off"}</span>
                      </div>
                      {(staff.tags?.length ?? 0) > 0 && (
                        <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                          {staff.tags!.slice(0, 3).join(" · ")}
                        </p>
                      )}
                      {staff.lastShift && (
                        <p className="text-[11px] text-white/45">
                          {staff.lastShift.start && staff.lastShift.end
                            ? `${staff.lastShift.start} – ${staff.lastShift.end}`
                            : "No recent shift"}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {staffOptions.length === 0 && (
            <p className="text-sm text-white/60">No staff records available yet.</p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 px-6 py-4 text-[11px] uppercase tracking-[0.35em]">
          <button
            type="button"
            onClick={onClear}
            className="text-white/60 hover:text-white"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-full border border-white/40 px-4 py-2 text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function ShiftComposerDialog({
  open,
  mode,
  form,
  staffOptions,
  focusOptions,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
  error,
}: {
  open: boolean;
  mode: ComposerMode;
  form: ShiftComposerForm;
  staffOptions: StaffOption[];
  focusOptions: ShiftFocus[];
  onClose: () => void;
  onChange: (field: keyof ShiftComposerForm, value: string | ShiftFocus | ShiftStatus) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  if (!open) return null;
  const isValid = Boolean(form.staffId && form.role.trim() && form.station.trim() && form.start && form.end);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-black/80 p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">{mode === "create" ? "Add shift" : "Edit shift"}</p>
            <h2 className="text-xl font-light">Crew assignment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70"
            disabled={isSubmitting}
          >
            Close
          </button>
        </header>

        <div className="mt-5 space-y-4">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
            Staff member
            <select
              value={form.staffId}
              onChange={(event) => onChange("staffId", event.target.value)}
              className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
            >
              {staffOptions.map((staff) => (
                <option
                  key={staff.id}
                  value={staff.id}
                >
                  {staff.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              Focus
              <select
                value={form.focus}
                onChange={(event) => onChange("focus", event.target.value as ShiftFocus)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              >
                {focusOptions.map((focus) => (
                  <option
                    key={focus}
                    value={focus}
                  >
                    {focus}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              Status
              <select
                value={form.status}
                onChange={(event) => onChange("status", event.target.value as ShiftStatus)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              >
                <option value="confirmed">confirmed</option>
                <option value="tentative">tentative</option>
                <option value="open">open</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              Role
              <input
                type="text"
                value={form.role}
                onChange={(event) => onChange("role", event.target.value)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              Station
              <input
                type="text"
                value={form.station}
                onChange={(event) => onChange("station", event.target.value)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              Start
              <input
                type="time"
                value={form.start}
                onChange={(event) => onChange("start", event.target.value)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              End
              <input
                type="time"
                value={form.end}
                onChange={(event) => onChange("end", event.target.value)}
                className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
            Note
            <textarea
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-white/60 focus:outline-none"
            />
          </label>

          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.35em]">
          <span className="text-white/50">Routes to owners</span>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-full border border-white/40 px-5 py-2 text-white disabled:opacity-40"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save shift"}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildScheduleSummary(assignments: ScheduleAssignment[]): ScheduleSummary {
  if (!assignments.length) {
    return {
      crewCount: 0,
      coverageLabel: "No coverage recorded",
      windowLabel: "—",
    };
  }

  const stations = Array.from(new Set(assignments.map((assignment) => assignment.station)));
  const earliest = Math.min(...assignments.map((assignment) => normalizeMinutes(assignment.start)));
  const latest = Math.max(...assignments.map((assignment) => normalizeMinutes(assignment.end)));

  return {
    crewCount: assignments.length,
    coverageLabel: stations.join(" · "),
    windowLabel: `${formatTimeLabel(earliest)} – ${formatTimeLabel(latest)}`,
  };
}

function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveDate(date: Date, deltaDays: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date();
  date.setFullYear(year, (month ?? 1) - 1, day ?? 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTimeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const date = new Date(Date.UTC(2024, 0, 1, hours, mins));
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function buildShiftBoundaries(referenceDate: Date, start: string, end: string): [string, string] {
  const startDate = new Date(referenceDate);
  const [startHour, startMinute] = start.split(":").map(Number);
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date(referenceDate);
  const [endHour, endMinute] = end.split(":").map(Number);
  endDate.setHours(endHour, endMinute, 0, 0);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return [startDate.toISOString(), endDate.toISOString()];
}

function createDefaultForm(staffOptions: StaffOption[], focusOptions: ShiftFocus[], preferredStaffId?: string) {
  const fallback = staffOptions[0];
  const selected = staffOptions.find((staff) => staff.id === (preferredStaffId ?? fallback?.id)) ?? fallback;
  const lastShift = selected?.lastShift;
  return {
    staffId: selected?.id ?? "",
    focus: lastShift?.focus ?? selected?.focus ?? focusOptions[0] ?? "service",
    role: lastShift?.role ?? selected?.defaultRole ?? "Shift Lead",
    station: lastShift?.station ?? "Line",
    start: lastShift?.start ?? "15:00",
    end: lastShift?.end ?? "23:00",
    status: "confirmed" as ShiftStatus,
    note: "",
  };
}

function createEmptyForm(initialData: SchedulePayload, initialStaffIds?: string[]) {
  const focusPalette = initialData.focusOptions.length ? initialData.focusOptions : SHIFT_FOCUS_ORDER;
  const preferredStaff = initialStaffIds?.[0];
  return createDefaultForm(initialData.staffOptions, focusPalette, preferredStaff);
}

function mapAssignmentToForm(assignment: ScheduleAssignment): ShiftComposerForm {
  return {
    id: assignment.id,
    staffId: assignment.staffId ?? "",
    focus: assignment.focus,
    role: assignment.role,
    station: assignment.station,
    start: assignment.start,
    end: assignment.end,
    status: assignment.status,
    note: assignment.note,
  };
}

function buildWindowBoundaries(date: Date): [string, string] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

const FILTER_PRESET_STORAGE_KEY = "staff-schedule-filter-preset";

function loadFilterPreset(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FILTER_PRESET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistFilterPreset(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    if (!ids.length) {
      window.localStorage.removeItem(FILTER_PRESET_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FILTER_PRESET_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore failures
  }
}

function getBrowserTimezone() {
  if (typeof Intl === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

const FOCUS_LABELS: Record<ShiftFocus | "other", string> = {
  service: "Service",
  prep: "Prep",
  guest: "Guest",
  bar: "Bar",
  ops: "Ops",
  other: "Unassigned",
};

function buildStaffGroups(options: StaffOption[]) {
  return options.reduce<Record<string, StaffOption[]>>((acc, option) => {
    const key = option.focus ?? "other";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(option);
    return acc;
  }, {});
}

