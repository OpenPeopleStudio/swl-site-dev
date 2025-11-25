"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";
import type {
  ReflectionEntry,
  ReflectionFilters,
  ReflectionPrompt,
  ReflectionRow,
  ReflectionSentiment,
  ReflectionStatus,
  ReflectionTag,
  ReflectionTagCatalogEntry,
} from "./reflection.types";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
] as const;

const DEFAULT_FILTERS: ReflectionFilters = {
  datePreset: "week",
  staffId: "all",
  tag: "all",
  shift: "all",
  query: "",
};

const SENTIMENT_ACCENTS: Record<string, { label: string; accent: string }> = {
  calm: { label: "Calm", accent: "#6ee7b7" },
  alert: { label: "Alert", accent: "#fbbf24" },
  critical: { label: "Critical", accent: "#f87171" },
  celebration: { label: "Win", accent: "#fde68a" },
  warm: { label: "Team", accent: "#f9a8d4" },
};

type StaffOption = { id: string; label: string; role?: string | null };

type ReflectionPageClientProps = {
  reflections: ReflectionEntry[];
  prompts: ReflectionPrompt[];
  initialFilters: ReflectionFilters;
};

type ComposerDraft = {
  staffId: string;
  staffName: string;
  role: string;
  shiftLabel: string;
  context: string;
  body: string;
  tags: ReflectionTag[];
  sentiment: ReflectionSentiment;
  eventId?: string;
  scheduleEntryId?: string;
  referenceUrl?: string;
};

type ReflectionComposerPayload = {
  staffId?: string;
  staffName: string;
  role?: string;
  shiftLabel?: string;
  context?: string;
  body: string;
  tags: ReflectionTag[];
  sentiment?: ReflectionSentiment;
  eventId?: string | null;
  scheduleEntryId?: string | null;
  referenceUrl?: string | null;
};

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  targetId?: string | null;
  draft: ComposerDraft;
  error: string | null;
  submitting: boolean;
};

export function ReflectionPageClient({ reflections, prompts, initialFilters }: ReflectionPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsedFilters = useMemo(
    () => parseFiltersFromSearch(searchParams, initialFilters),
    [initialFilters, searchParams],
  );

  const [filters, setFilters] = useState<ReflectionFilters>(() => parsedFilters);

  useEffect(() => {
    setFilters((current) => (areFiltersEqual(current, parsedFilters) ? current : parsedFilters));
  }, [parsedFilters]);

  const {
    entries,
    prompts: promptStream,
    status,
    counts,
    staffOptions,
    tagCatalog,
    refresh,
    createReflection,
    updateReflection,
  } = useReflectionData({
    initialEntries: reflections,
    initialPrompts: prompts,
    filters,
  });

  const shiftOptions = useMemo(() => deriveShiftOptions(entries), [entries]);

  const linkedFilters = {
    scheduleEntryId: filters.scheduleEntryId,
    eventId: filters.eventId,
  };

  const [editorState, setEditorState] = useState<EditorState>(() => ({
    open: false,
    mode: "create",
    draft: createEmptyDraft(),
    error: null,
    submitting: false,
  }));

  const groupedEntries = useMemo(() => groupByDay(entries), [entries]);

  const handleFilterChange = useCallback(
    (partial: Partial<ReflectionFilters>) => {
      setFilters((current) => {
        const next = normalizeFilters({ ...current, ...partial });
        syncFiltersToQuery(router, pathname, next);
        return next;
      });
    },
    [pathname, router],
  );

  const handleAddReflection = useCallback(() => {
    setEditorState({
      open: true,
      mode: "create",
      draft: createEmptyDraft(staffOptions),
      targetId: null,
      error: null,
      submitting: false,
    });
  }, [staffOptions]);

  const handleEditReflection = useCallback((entry: ReflectionEntry) => {
    setEditorState({
      open: true,
      mode: "edit",
      draft: mapEntryToDraft(entry),
      targetId: entry.id,
      error: null,
      submitting: false,
    });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState((prev) => ({ ...prev, open: false, error: null, submitting: false }));
  }, []);

  const saveEditor = useCallback(async () => {
    if (!editorState.open) return;
    const { draft, mode, targetId } = editorState;
    if (!draft.staffName.trim() || !draft.body.trim()) {
      setEditorState((prev) => ({ ...prev, error: "Name and reflection body are required." }));
      return;
    }
    setEditorState((prev) => ({ ...prev, submitting: true, error: null }));
    const payload = buildComposerPayload(draft, tagCatalog);
    try {
      if (mode === "create") {
        await createReflection(payload);
      } else if (targetId) {
        await updateReflection(targetId, payload);
      }
      closeEditor();
      await refresh();
    } catch (error) {
      setEditorState((prev) => ({
        ...prev,
        submitting: false,
        error: error instanceof Error ? error.message : "Unable to save reflection",
      }));
    }
  }, [closeEditor, createReflection, editorState, refresh, tagCatalog, updateReflection]);

  return (
    <section className="mt-8 flex flex-col gap-10 lg:flex-row lg:gap-12">
      <div className="flex-1 space-y-8">
        <ReflectionHeaderControls
          filters={filters}
          counts={counts}
          staffOptions={staffOptions}
          tagCatalog={tagCatalog}
          shiftOptions={shiftOptions}
          linkedFilters={linkedFilters}
          status={status}
          onChangeFilters={handleFilterChange}
          onAddReflection={handleAddReflection}
          onRefresh={refresh}
        />
        <ReflectionTimeline
          groups={groupedEntries}
          status={status}
          onRetry={refresh}
          onEdit={handleEditReflection}
          linkedFilters={linkedFilters}
          tagCatalog={tagCatalog}
        />
      </div>
      <div className="w-full space-y-6 lg:max-w-sm">
        <ReflectionPromptsPanel prompts={promptStream} />
        <ReflectionLegend tagCatalog={tagCatalog} />
      </div>

      <ReflectionEditorModal
        open={editorState.open}
        mode={editorState.mode}
        staffOptions={staffOptions}
        tagCatalog={tagCatalog}
        draft={editorState.draft}
        onDraftChange={(draft) => setEditorState((prev) => ({ ...prev, draft }))}
        error={editorState.error}
        submitting={editorState.submitting}
        onClose={closeEditor}
        onSave={saveEditor}
      />
    </section>
  );
}

function ReflectionHeaderControls({
  filters,
  counts,
  staffOptions,
  tagCatalog,
  shiftOptions,
  linkedFilters,
  status,
  onChangeFilters,
  onAddReflection,
  onRefresh,
}: {
  filters: ReflectionFilters;
  counts: { total: number; filtered: number };
  staffOptions: StaffOption[];
  tagCatalog: ReflectionTagCatalogEntry[];
  shiftOptions: string[];
  linkedFilters: { scheduleEntryId?: string; eventId?: string };
  status: ReflectionStatus;
  onChangeFilters: (next: Partial<ReflectionFilters>) => void;
  onAddReflection: () => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.45em] text-white/40">Reflection log</p>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-3xl font-light tracking-wide text-white">{counts.filtered}</p>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">of {counts.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <StatusPill status={status} />
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-white/20 px-4 py-2 text-[0.6rem] uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onAddReflection}
            className="rounded-full bg-white px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white/80"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChangeFilters({ datePreset: preset.value })}
            className={`rounded-full px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] ${
              filters.datePreset === preset.value
                ? "bg-white text-black"
                : "border border-white/20 text-white/70 hover:border-white/40"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <input
          type="search"
          value={filters.query}
          onChange={(event) => onChangeFilters({ query: event.target.value })}
          placeholder="Search reflections"
          className="ml-auto min-w-[200px] flex-1 rounded-full border border-white/15 bg-transparent px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white placeholder:text-white/35"
        />
      </div>

      {filters.datePreset === "custom" && (
        <DateRangeControls
          filters={filters}
          onChange={(partial) => onChangeFilters(partial)}
        />
      )}

      {(linkedFilters.scheduleEntryId || linkedFilters.eventId) && (
        <LinkedFilterNotice
          scheduleId={linkedFilters.scheduleEntryId}
          eventId={linkedFilters.eventId}
          onClear={() => onChangeFilters({ scheduleEntryId: undefined, eventId: undefined })}
        />
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <LabelledSelect
          label="Staff"
          value={filters.staffId}
          onChange={(value) => onChangeFilters({ staffId: value })}
          options={[
            { id: "all", label: "All crew" },
            ...staffOptions.map((staff) => ({
              id: staff.id,
              label: staff.role ? `${staff.label} · ${staff.role}` : staff.label,
            })),
          ]}
        />
        <LabelledSelect
          label="Tag"
          value={filters.tag ?? "all"}
          onChange={(value) => onChangeFilters({ tag: value as ReflectionTag | "all" })}
          options={[
            { id: "all", label: "All tags" },
            ...tagCatalog.map((tag) => ({ id: tag.slug, label: tag.label })),
          ]}
        />
        <LabelledSelect
          label="Shift"
          value={filters.shift}
          onChange={(value) => onChangeFilters({ shift: value })}
          options={[{ id: "all", label: "All shifts" }, ...shiftOptions.map((shift) => ({ id: shift, label: shift }))]}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReflectionStatus }) {
  const copy = status === "idle" ? "Synced" : status === "loading" ? "Loading" : "Error";
  const tone =
    status === "idle"
      ? "border-emerald-400/40 text-emerald-200"
      : status === "loading"
        ? "border-white/30 text-white/70"
        : "border-rose-400/40 text-rose-200";
  return (
    <span className={`rounded-full border px-4 py-1 text-[0.55rem] uppercase tracking-[0.35em] ${tone}`}>
      {copy}
    </span>
  );
}

function DateRangeControls({
  filters,
  onChange,
}: {
  filters: ReflectionFilters;
  onChange: (partial: Partial<ReflectionFilters>) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 text-xs uppercase tracking-[0.3em] text-white/50 md:grid-cols-2">
      <label>
        Start
        <input
          type="date"
          value={filters.startDate ?? ""}
          onChange={(event) => onChange({ startDate: event.target.value || undefined })}
          className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-white"
        />
      </label>
      <label>
        End
        <input
          type="date"
          value={filters.endDate ?? ""}
          onChange={(event) => onChange({ endDate: event.target.value || undefined })}
          className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-white"
        />
      </label>
    </div>
  );
}

function LinkedFilterNotice({
  scheduleId,
  eventId,
  onClear,
}: {
  scheduleId?: string;
  eventId?: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
      <div className="min-w-[200px]">
        <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/40">Linked view</p>
        <p className="text-sm">
          {eventId ? `Focused on event ${eventId}` : ""}
          {scheduleId ? `${eventId ? " · " : ""}Shift ${scheduleId}` : ""}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {scheduleId && (
          <Link
            prefetch={false}
            href={`/staff/schedule?highlight=${scheduleId}`}
            className="rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] text-white/70 hover:border-white/50"
          >
            View shift
          </Link>
        )}
        {eventId && (
          <Link
            prefetch={false}
            href={`/staff/events?eventId=${eventId}`}
            className="rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] text-white/70 hover:border-white/50"
          >
            View event
          </Link>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/20 px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] text-white/70 hover:border-white/50"
        >
          Clear link
        </button>
      </div>
    </div>
  );
}

function LabelledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-white/40">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-full border border-white/15 bg-white/[0.02] px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-black text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReflectionTimeline({
  groups,
  status,
  onRetry,
  onEdit,
  tagCatalog,
  linkedFilters,
}: {
  groups: ReflectionDayGroup[];
  status: ReflectionStatus;
  onRetry: () => Promise<void>;
  onEdit: (entry: ReflectionEntry) => void;
  tagCatalog: ReflectionTagCatalogEntry[];
  linkedFilters: { scheduleEntryId?: string; eventId?: string };
}) {
  if (status === "loading") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-6 py-8 text-center text-sm text-rose-100">
        <p>Unable to load reflections right now.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-rose-200/50 px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-rose-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 px-6 py-10 text-center text-sm text-white/60">
        No reflections match the current filters.
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/[0.015] px-6 py-8">
      <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent" aria-hidden />
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-4 pl-10 text-sm font-semibold uppercase tracking-[0.3em] text-white/60">{group.label}</div>
            <div className="space-y-6 pl-10">
              {group.entries.map((entry) => (
                <ReflectionEntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={onEdit}
                  tagCatalog={tagCatalog}
                  linkedFilters={linkedFilters}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReflectionEntryRow({
  entry,
  onEdit,
  tagCatalog,
  linkedFilters,
}: {
  entry: ReflectionEntry;
  onEdit: (entry: ReflectionEntry) => void;
  tagCatalog: ReflectionTagCatalogEntry[];
  linkedFilters: { scheduleEntryId?: string; eventId?: string };
}) {
  const timestamp = formatTime(entry.createdAt);
  const tone = resolveTone(entry, tagCatalog);
  const accentColor = tone?.accent ?? "rgba(255,255,255,0.4)";
  const glow = tone ? withAlpha(accentColor, 0.35) : undefined;
  const ribbon = tone ? withAlpha(accentColor, 0.12) : undefined;
  const isLinkedTarget =
    (linkedFilters.scheduleEntryId && entry.scheduleEntryId === linkedFilters.scheduleEntryId) ||
    (linkedFilters.eventId && entry.eventId === linkedFilters.eventId);

  return (
    <article
      className={`relative border-l-2 pl-6 transition-colors ${isLinkedTarget ? "bg-white/5" : ""}`}
      style={{
        borderColor: accentColor,
        backgroundImage: ribbon ? `linear-gradient(90deg, ${ribbon}, transparent 70%)` : undefined,
        boxShadow: glow ? `0 25px 60px -40px ${glow}` : undefined,
      }}
    >
      <div
        className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border"
        style={{ borderColor: accentColor, backgroundColor: accentColor }}
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
        <span className="max-w-[200px] truncate whitespace-nowrap text-white">{entry.staffName}</span>
        {entry.role && <span className="max-w-[140px] truncate whitespace-nowrap">{entry.role}</span>}
        <span className="max-w-[220px] truncate whitespace-nowrap">{entry.shiftLabel ?? "Shift TBC"}</span>
        <span className="whitespace-nowrap">{timestamp}</span>
        {tone && (
          <span
            className="rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.35em]"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            {tone.label}
          </span>
        )}
        <button
          type="button"
          className="ml-auto rounded-full border border-white/20 px-3 py-1 text-[0.5rem] uppercase tracking-[0.35em] text-white/70 hover:border-white/40"
          onClick={() => onEdit(entry)}
        >
          Edit
        </button>
      </div>
      {entry.context && <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/40">{entry.context}</p>}
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90">{entry.body}</p>
      {(entry.scheduleEntryId || entry.eventId) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.55rem] uppercase tracking-[0.35em] text-white/50">
          {entry.scheduleEntryId && (
            <Link
              prefetch={false}
              href={`/staff/schedule?highlight=${entry.scheduleEntryId}`}
              className="rounded-full border border-white/20 px-3 py-1 hover:border-white/50"
            >
              Shift
            </Link>
          )}
          {entry.eventId && (
            <Link
              prefetch={false}
              href={`/staff/events?eventId=${entry.eventId}`}
              className="rounded-full border border-white/20 px-3 py-1 hover:border-white/50"
            >
              Event
            </Link>
          )}
        </div>
      )}
      {entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
          {entry.tags.map((tag) => (
            <span key={`${entry.id}-${tag}`} className="rounded-full border border-white/20 px-3 py-1 whitespace-nowrap">
              {tagCatalog.find((record) => record.slug === tag)?.label ?? tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ReflectionPromptsPanel({ prompts }: { prompts: ReflectionPrompt[] }) {
  if (!prompts.length) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] px-5 py-6">
      <header className="text-xs uppercase tracking-[0.4em] text-white/40">Tonight&rsquo;s prompts</header>
      <div className="mt-4 space-y-4 text-sm text-white/80">
        {prompts.map((prompt) => (
          <article key={prompt.id} className="rounded-2xl border border-white/10 bg-white/[0.01] px-4 py-3">
            <p>{prompt.text}</p>
            {prompt.cadence && (
              <p className="mt-2 text-[0.6rem] uppercase tracking-[0.35em] text-white/40">{prompt.cadence}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ReflectionLegend({ tagCatalog }: { tagCatalog: ReflectionTagCatalogEntry[] }) {
  if (!tagCatalog.length) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] px-5 py-6 text-sm text-white/70">
      <header className="text-xs uppercase tracking-[0.35em] text-white/40">Tag signals</header>
      <ul className="mt-3 space-y-2">
        {tagCatalog.map((tag) => (
          <li key={tag.slug} className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tag.accentColor ?? SENTIMENT_ACCENTS[tag.tone ?? "calm"]?.accent ?? "#94a3b8" }}
            />
            <div>
              <p className="uppercase tracking-[0.3em] text-white/60">{tag.label}</p>
              {tag.description && <p className="text-xs text-white/40">{tag.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReflectionEditorModal({
  open,
  mode,
  staffOptions,
  tagCatalog,
  draft,
  onDraftChange,
  error,
  submitting,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  staffOptions: StaffOption[];
  tagCatalog: ReflectionTagCatalogEntry[];
  draft: ComposerDraft;
  onDraftChange: (draft: ComposerDraft) => void;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const staffLookup = new Map(staffOptions.map((staff) => [staff.id, staff]));

  const handleStaffSelect = (value: string) => {
    const option = staffLookup.get(value);
    onDraftChange({
      ...draft,
      staffId: value,
      staffName: option ? option.label : "",
      role: option?.role ?? draft.role,
    });
  };

  const toggleTag = (tag: ReflectionTag) => {
    const exists = draft.tags.includes(tag);
    const nextTags = exists ? draft.tags.filter((value) => value !== tag) : [...draft.tags, tag];
    onDraftChange({ ...draft, tags: nextTags });
  };

  const titleId = "reflection-editor-title";
  const descriptionId = "reflection-editor-description";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
    >
      <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#050809] p-6 text-white shadow-[0_25px_140px_rgba(0,0,0,0.65)]">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Reflection</p>
            <h2 id={titleId} className="text-2xl font-light tracking-[0.2em]">
              {mode === "create" ? "New breadcrumb" : "Edit reflection"}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm text-white/50">
              Capture the shift context, tags, and tone so the log stays searchable and calm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 hover:border-white/60"
          >
            Close
          </button>
        </header>

        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Staff
              <select
                value={draft.staffId}
                onChange={(event) => handleStaffSelect(event.target.value)}
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              >
                <option value="" className="bg-black text-white">
                  Select roster
                </option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id} className="bg-black text-white">
                    {staff.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Custom name
              <input
                value={draft.staffName}
                onChange={(event) => onDraftChange({ ...draft, staffName: event.target.value })}
                placeholder="Crew member"
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Role / Station
              <input
                value={draft.role}
                onChange={(event) => onDraftChange({ ...draft, role: event.target.value })}
                placeholder="Service captain"
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Shift
              <input
                value={draft.shiftLabel}
                onChange={(event) => onDraftChange({ ...draft, shiftLabel: event.target.value })}
                placeholder="Dinner · 2nd seating"
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              />
            </label>
          </div>

          <label className="text-xs uppercase tracking-[0.35em] text-white/40">
            Context
            <input
              value={draft.context}
              onChange={(event) => onDraftChange({ ...draft, context: event.target.value })}
              placeholder="Menu allergen visibility"
              className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
            />
          </label>

          <label className="text-xs uppercase tracking-[0.35em] text-white/40">
            Reflection
            <textarea
              value={draft.body}
              onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
              rows={5}
              className="mt-1 w-full rounded-3xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white"
              placeholder="Keep the log calm and specific."
            />
          </label>

          <TagPicker tagCatalog={tagCatalog} selected={draft.tags} onToggle={toggleTag} />

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Sentiment
              <select
                value={draft.sentiment}
                onChange={(event) => onDraftChange({ ...draft, sentiment: event.target.value as ReflectionSentiment })}
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              >
                {Object.keys(SENTIMENT_ACCENTS).map((tone) => (
                  <option key={tone} value={tone} className="bg-black text-white">
                    {SENTIMENT_ACCENTS[tone].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Schedule ref
              <input
                value={draft.scheduleEntryId ?? ""}
                onChange={(event) => onDraftChange({ ...draft, scheduleEntryId: event.target.value || undefined })}
                placeholder="Shift ID"
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40">
              Event ref
              <input
                value={draft.eventId ?? ""}
                onChange={(event) => onDraftChange({ ...draft, eventId: event.target.value || undefined })}
                placeholder="Event ID"
                className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
              />
            </label>
          </div>

          <label className="text-xs uppercase tracking-[0.35em] text-white/40">
            Reference link
            <input
              value={draft.referenceUrl ?? ""}
              onChange={(event) => onDraftChange({ ...draft, referenceUrl: event.target.value || undefined })}
              placeholder="https://"
              className="mt-1 w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white"
            />
          </label>

          {error && <p className="rounded-2xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 text-xs uppercase tracking-[0.35em]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-5 py-2 text-white/70 hover:border-white/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting}
            className="rounded-full bg-white px-5 py-2 text-black hover:bg-white/80 disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "create" ? "Save reflection" : "Update reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagPicker({
  tagCatalog,
  selected,
  onToggle,
}: {
  tagCatalog: ReflectionTagCatalogEntry[];
  selected: ReflectionTag[];
  onToggle: (tag: ReflectionTag) => void;
}) {
  if (!tagCatalog.length) return null;
  return (
    <div className="text-xs uppercase tracking-[0.35em] text-white/40">
      Tags
      <div className="mt-2 flex flex-wrap gap-2">
        {tagCatalog.map((tag) => {
          const active = selected.includes(tag.slug);
          const accent = tag.accentColor ?? SENTIMENT_ACCENTS[tag.tone ?? "calm"]?.accent ?? "#94a3b8";
          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => onToggle(tag.slug)}
              className={`rounded-full border px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] ${
                active ? "text-black" : "text-white/70"
              }`}
              style={{
                borderColor: accent,
                backgroundColor: active ? accent : "transparent",
              }}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type UseReflectionDataArgs = {
  initialEntries: ReflectionEntry[];
  initialPrompts: ReflectionPrompt[];
  filters: ReflectionFilters;
};

type UseReflectionDataResult = {
  entries: ReflectionEntry[];
  prompts: ReflectionPrompt[];
  status: ReflectionStatus;
  counts: { total: number; filtered: number };
  staffOptions: StaffOption[];
  tagCatalog: ReflectionTagCatalogEntry[];
  refresh: () => Promise<void>;
  createReflection: (payload: ReflectionComposerPayload) => Promise<void>;
  updateReflection: (id: string, payload: ReflectionComposerPayload) => Promise<void>;
};

function useReflectionData({ initialEntries, initialPrompts, filters }: UseReflectionDataArgs): UseReflectionDataResult {
  const supabase = supabaseBrowser;
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [entries, setEntries] = useState(initialEntries);
  const [prompts, setPrompts] = useState(initialPrompts);
  const [status, setStatus] = useState<ReflectionStatus>("idle");
  const [counts, setCounts] = useState({ total: initialEntries.length, filtered: initialEntries.length });
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [tagCatalog, setTagCatalog] = useState<ReflectionTagCatalogEntry[]>([]);
  const [, startTransition] = useTransition();

  const fetchReflections = useCallback(
    async (activeFilters: ReflectionFilters) => {
      const { start, end } = resolveDateBounds(activeFilters);
      const query = supabase
        .from("staff_reflections")
        .select(
          [
            "id",
            "owner",
            "summary",
            "tags",
            "created_at",
            "role",
            "shift_label",
            "context",
            "sentiment",
            "staff_id",
            "schedule_entry_id",
            "event_id",
            "reference_url",
          ].join(","),
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (start) query.gte("created_at", start);
      if (end) query.lte("created_at", end);
      if (activeFilters.staffId !== "all") query.eq("staff_id", activeFilters.staffId);
      if (activeFilters.tag !== "all") query.contains("tags", [activeFilters.tag]);
      if (activeFilters.shift !== "all") query.ilike("shift_label", `%${activeFilters.shift}%`);
      if (activeFilters.query.trim()) {
        const term = activeFilters.query.trim();
        query.or(
          [
            `summary.ilike.%${term}%`,
            `context.ilike.%${term}%`,
            `owner.ilike.%${term}%`,
            `shift_label.ilike.%${term}%`,
          ].join(","),
        );
      }

      const { data, error, count } = await query;
      if (error) {
        console.error("[reflection] fetch error", error);
        throw error;
      }

      const rows = (data ?? []) as unknown as ReflectionRow[];
      const mapped = rows.map(mapRowToEntry);
      return { entries: mapped, total: count ?? mapped.length };
    },
    [supabase],
  );

  const refresh = useCallback(async () => {
    startTransition(() => setStatus("loading"));
    try {
      const payload = await fetchReflections(filtersRef.current);
      startTransition(() => {
        setEntries(payload.entries);
        setCounts({ total: payload.total, filtered: payload.entries.length });
        setStatus("idle");
      });
    } catch (error) {
      console.error("[reflection] refresh error", error);
      startTransition(() => setStatus("error"));
      throw error;
    }
  }, [fetchReflections, startTransition]);

  useEffect(() => {
    let active = true;
    startTransition(() => setStatus("loading"));
    fetchReflections(filters)
      .then((payload) => {
        if (!active) return;
        startTransition(() => {
          setEntries(payload.entries);
          setCounts({ total: payload.total, filtered: payload.entries.length });
          setStatus("idle");
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error("[reflection] initial load error", error);
        startTransition(() => setStatus("error"));
      });
    return () => {
      active = false;
    };
  }, [fetchReflections, filters, startTransition]);

  const fetchPrompts = useCallback(async () => {
    const { data, error } = await supabase
      .from("reflection_prompts")
      .select("id, text, cadence, tags, audience, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      startTransition(() => {
        setPrompts(
          data.map((row) => ({
            id: row.id,
            text: row.text,
            cadence: row.cadence ?? undefined,
            tags: Array.isArray(row.tags) ? row.tags : undefined,
            audience: row.audience ?? undefined,
            sortOrder: row.sort_order ?? undefined,
          })),
        );
      });
    }
  }, [startTransition, supabase]);

  const fetchStaffDirectory = useCallback(async () => {
    const { data, error } = await supabase.from("staff").select("id, full_name, role").order("full_name", { ascending: true });
    if (!error && data) {
      startTransition(() => {
        setStaffOptions(
          data.map((row) => ({
            id: row.id,
            label: row.full_name ?? "Crew",
            role: row.role,
          })),
        );
      });
    }
  }, [startTransition, supabase]);

  const fetchTagCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from("reflection_tag_catalog")
      .select("slug, label, tone, accent_color, description")
      .order("label", { ascending: true });
    if (!error && data) {
      startTransition(() => {
        setTagCatalog(
          data.map((row) => ({
            slug: row.slug,
            label: row.label ?? row.slug,
            tone: (row.tone ?? "calm") as ReflectionSentiment,
            accentColor: row.accent_color ?? undefined,
            description: row.description ?? undefined,
          })),
        );
      });
    }
  }, [startTransition, supabase]);

  useEffect(() => {
    fetchPrompts();
    fetchStaffDirectory();
    fetchTagCatalog();
  }, [fetchPrompts, fetchStaffDirectory, fetchTagCatalog]);

  useEffect(() => {
    const reflectionsChannel = supabase
      .channel("staff_reflections_stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_reflections" }, () => refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "staff_reflections" }, () => refresh())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "staff_reflections" }, () => refresh())
      .subscribe();
    const promptsChannel = supabase
      .channel("reflection_prompts_stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "reflection_prompts" }, () => fetchPrompts())
      .subscribe();
    const staffChannel = supabase
      .channel("staff_directory_stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, () => fetchStaffDirectory())
      .subscribe();
    const tagChannel = supabase
      .channel("reflection_tag_catalog_stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "reflection_tag_catalog" }, () => fetchTagCatalog())
      .subscribe();
    return () => {
      supabase.removeChannel(reflectionsChannel);
      supabase.removeChannel(promptsChannel);
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(tagChannel);
    };
  }, [fetchPrompts, fetchStaffDirectory, fetchTagCatalog, refresh, supabase]);

  const createReflection = useCallback(
    async (payload: ReflectionComposerPayload) => {
      const { error } = await supabase.from("staff_reflections").insert({
        staff_id: payload.staffId ?? null,
        owner: payload.staffName,
        role: payload.role ?? null,
        shift_label: payload.shiftLabel ?? null,
        context: payload.context ?? null,
        summary: payload.body,
        tags: payload.tags,
        sentiment: payload.sentiment ?? null,
        event_id: payload.eventId ?? null,
        schedule_entry_id: payload.scheduleEntryId ?? null,
        reference_url: payload.referenceUrl ?? null,
      });
      if (error) {
        console.error("[reflection] insert error", error);
        throw new Error(error.message);
      }
    },
    [supabase],
  );

  const updateReflection = useCallback(
    async (id: string, payload: ReflectionComposerPayload) => {
      const { error } = await supabase
        .from("staff_reflections")
        .update({
          staff_id: payload.staffId ?? null,
          owner: payload.staffName,
          role: payload.role ?? null,
          shift_label: payload.shiftLabel ?? null,
          context: payload.context ?? null,
          summary: payload.body,
          tags: payload.tags,
          sentiment: payload.sentiment ?? null,
          event_id: payload.eventId ?? null,
          schedule_entry_id: payload.scheduleEntryId ?? null,
          reference_url: payload.referenceUrl ?? null,
        })
        .eq("id", id);
      if (error) {
        console.error("[reflection] update error", error);
        throw new Error(error.message);
      }
    },
    [supabase],
  );

  return {
    entries,
    prompts,
    status,
    counts,
    staffOptions,
    tagCatalog,
    refresh,
    createReflection,
    updateReflection,
  };
}

type ReflectionDayGroup = {
  key: string;
  label: string;
  entries: ReflectionEntry[];
};

function groupByDay(entries: ReflectionEntry[]): ReflectionDayGroup[] {
  const groups = new Map<string, ReflectionDayGroup>();
  entries.forEach((entry) => {
    const date = new Date(entry.createdAt);
    const key = Number.isNaN(date.getTime()) ? "undated" : date.toISOString().slice(0, 10);
    const label = Number.isNaN(date.getTime()) ? "Undated" : formatDateHeading(date);
    if (!groups.has(key)) {
      groups.set(key, { key, label, entries: [] });
    }
    groups.get(key)!.entries.push(entry);
  });
  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function mapRowToEntry(row: ReflectionRow): ReflectionEntry {
  return {
    id: row.id,
    staffId: row.staff_id ?? undefined,
    staffName: row.owner ?? "Crew",
    role: row.role ?? undefined,
    shiftLabel: row.shift_label ?? undefined,
    tags: Array.isArray(row.tags) ? (row.tags as ReflectionTag[]) : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    body: row.summary ?? "",
    context: row.context ?? undefined,
    sentiment: row.sentiment ?? undefined,
    scheduleEntryId: row.schedule_entry_id ?? undefined,
    eventId: row.event_id ?? undefined,
    referenceUrl: row.reference_url ?? undefined,
  };
}

function formatDateHeading(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function resolveTone(entry: ReflectionEntry, catalog: ReflectionTagCatalogEntry[]) {
  if (entry.sentiment && SENTIMENT_ACCENTS[entry.sentiment]) {
    return SENTIMENT_ACCENTS[entry.sentiment];
  }
  for (const tag of entry.tags) {
    const metadata = catalog.find((record) => record.slug === tag);
    if (metadata) {
      const accent = metadata.accentColor ?? SENTIMENT_ACCENTS[metadata.tone ?? "calm"]?.accent ?? "#94a3b8";
      return { label: metadata.label, accent };
    }
  }
  return null;
}

function createEmptyDraft(staffOptions: StaffOption[] = []): ComposerDraft {
  const first = staffOptions[0];
  return {
    staffId: first?.id ?? "",
    staffName: first?.label ?? "",
    role: first?.role ?? "",
    shiftLabel: "",
    context: "",
    body: "",
    tags: [],
    sentiment: "calm",
    eventId: "",
    scheduleEntryId: "",
    referenceUrl: "",
  };
}

function mapEntryToDraft(entry: ReflectionEntry): ComposerDraft {
  return {
    staffId: entry.staffId ?? "",
    staffName: entry.staffName,
    role: entry.role ?? "",
    shiftLabel: entry.shiftLabel ?? "",
    context: entry.context ?? "",
    body: entry.body,
    tags: entry.tags,
    sentiment: (entry.sentiment ?? "calm") as ReflectionSentiment,
    eventId: entry.eventId ?? "",
    scheduleEntryId: entry.scheduleEntryId ?? "",
    referenceUrl: entry.referenceUrl ?? "",
  };
}

function buildComposerPayload(draft: ComposerDraft, catalog: ReflectionTagCatalogEntry[]): ReflectionComposerPayload {
  const sentiment = draft.sentiment || deriveSentimentFromTags(draft.tags, catalog);
  return {
    staffId: draft.staffId || undefined,
    staffName: draft.staffName.trim(),
    role: draft.role.trim() || undefined,
    shiftLabel: draft.shiftLabel.trim() || undefined,
    context: draft.context.trim() || undefined,
    body: draft.body.trim(),
    tags: draft.tags,
    sentiment,
    eventId: draft.eventId?.trim() || null,
    scheduleEntryId: draft.scheduleEntryId?.trim() || null,
    referenceUrl: draft.referenceUrl?.trim() || null,
  };
}

function deriveSentimentFromTags(tags: ReflectionTag[], catalog: ReflectionTagCatalogEntry[]): ReflectionSentiment | undefined {
  for (const tag of tags) {
    const match = catalog.find((entry) => entry.slug === tag);
    if (match?.tone) return match.tone;
  }
  return undefined;
}

function deriveShiftOptions(entries: ReflectionEntry[]) {
  const shifts = new Set<string>();
  entries.forEach((entry) => {
    if (entry.shiftLabel) {
      shifts.add(entry.shiftLabel);
    }
  });
  return Array.from(shifts).sort();
}

function resolveDateBounds(filters: ReflectionFilters) {
  if (filters.datePreset === "custom") {
    return {
      start: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
      end: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
    };
  }
  const now = new Date();
  const end = now.toISOString();
  const start = new Date(now);
  if (filters.datePreset === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (filters.datePreset === "week") {
    start.setDate(start.getDate() - 7);
  } else if (filters.datePreset === "month") {
    start.setDate(start.getDate() - 30);
  }
  return { start: start.toISOString(), end };
}

function parseFiltersFromSearch(searchParams: ReadonlyURLSearchParams, fallback: ReflectionFilters) {
  const params = searchParams;
  const next: ReflectionFilters = {
    datePreset: isPreset(params.get("datePreset")) ? (params.get("datePreset") as ReflectionFilters["datePreset"]) : fallback.datePreset ?? DEFAULT_FILTERS.datePreset,
    staffId: params.get("staffId") ?? fallback.staffId ?? DEFAULT_FILTERS.staffId,
    tag: (params.get("tag") ?? fallback.tag ?? DEFAULT_FILTERS.tag) as ReflectionFilters["tag"],
    shift: params.get("shift") ?? fallback.shift ?? DEFAULT_FILTERS.shift,
    query: params.get("query") ?? fallback.query ?? DEFAULT_FILTERS.query,
  };
  if (next.datePreset === "custom") {
    next.startDate = params.get("start") ?? fallback.startDate;
    next.endDate = params.get("end") ?? fallback.endDate;
  }
  const scheduleId = params.get("scheduleId") ?? fallback.scheduleEntryId;
  const eventId = params.get("eventId") ?? fallback.eventId;
  if (scheduleId) next.scheduleEntryId = scheduleId;
  if (eventId) next.eventId = eventId;
  return normalizeFilters(next);
}

function normalizeFilters(filters: ReflectionFilters): ReflectionFilters {
  const next = { ...filters };
  if (next.datePreset !== "custom") {
    delete next.startDate;
    delete next.endDate;
  }
  if (!next.scheduleEntryId) {
    delete next.scheduleEntryId;
  }
  if (!next.eventId) {
    delete next.eventId;
  }
  return next;
}

function areFiltersEqual(a: ReflectionFilters, b: ReflectionFilters) {
  return (
    a.datePreset === b.datePreset &&
    a.staffId === b.staffId &&
    a.tag === b.tag &&
    a.shift === b.shift &&
    a.query === b.query &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.scheduleEntryId === b.scheduleEntryId &&
    a.eventId === b.eventId
  );
}

function syncFiltersToQuery(router: ReturnType<typeof useRouter>, pathname: string, filters: ReflectionFilters) {
  const params = new URLSearchParams();
  if (filters.datePreset !== DEFAULT_FILTERS.datePreset) params.set("datePreset", filters.datePreset);
  if (filters.staffId !== "all") params.set("staffId", filters.staffId);
  if (filters.tag !== "all") params.set("tag", filters.tag);
  if (filters.shift !== "all") params.set("shift", filters.shift);
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.datePreset === "custom") {
    if (filters.startDate) params.set("start", filters.startDate);
    if (filters.endDate) params.set("end", filters.endDate);
  }
  if (filters.scheduleEntryId) params.set("scheduleId", filters.scheduleEntryId);
  if (filters.eventId) params.set("eventId", filters.eventId);
  const query = params.toString();
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

function isPreset(value: string | null): value is ReflectionFilters["datePreset"] {
  return value === "today" || value === "week" || value === "month" || value === "custom";
}

function withAlpha(color: string, alpha: number) {
  if (!color) {
    return `rgba(255,255,255,${alpha})`;
  }
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].every((value) => Number.isFinite(value))) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

