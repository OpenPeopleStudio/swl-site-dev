"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import {
  SHIFT_FOCUS_ORDER,
  type ScheduleAssignment,
  type ScheduleState,
  type ShiftFocus,
  type ShiftStatus,
} from "@/domains/staff/schedule/types";

const STATUS_META: Record<ShiftStatus, { label: string; dotClass: string; copy: string }> = {
  confirmed: { label: "Confirmed", dotClass: "bg-emerald-300/70", copy: "Locked and on floor" },
  tentative: { label: "Tentative", dotClass: "bg-amber-300/70", copy: "Awaiting confirmation" },
  open: { label: "Open", dotClass: "bg-white/60", copy: "Requires backfill" },
};

const FOCUS_META: Record<ShiftFocus, { label: string; tint: string }> = {
  service: { label: "Service", tint: "border-white/30 text-white/80" },
  prep: { label: "Prep", tint: "border-amber-200/60 text-amber-100" },
  guest: { label: "Guest", tint: "border-cyan-200/60 text-cyan-100" },
  ops: { label: "Ops", tint: "border-white/25 text-white/70" },
  bar: { label: "Bar", tint: "border-pink-200/60 text-pink-100" },
};

const SHIFT_STATUS_VALUES: ShiftStatus[] = ["confirmed", "tentative", "open"];

const DEFAULT_TIMELINE_MARKS = ["05:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "02:30"];
const MINUTES_IN_DAY = 24 * 60;
const DAY_START_MINUTES = 5 * 60;
const DAY_END_MINUTES = DAY_START_MINUTES + 22 * 60;
const DAY_RANGE_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;
const GRID_TEMPLATE = "grid-cols-[minmax(160px,1.1fr)_minmax(140px,0.9fr)_minmax(360px,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)]";

type ScheduleGridProps = {
  assignments: ScheduleAssignment[];
  state: ScheduleState;
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
  onEditShift?: (assignment: ScheduleAssignment) => void;
  timelineMarks?: string[];
};

export function ScheduleGrid({
  assignments,
  state,
  highlightedId = null,
  onHighlight,
  onEditShift,
  timelineMarks = DEFAULT_TIMELINE_MARKS,
}: ScheduleGridProps) {
  if (state === "loading") {
    return <ScheduleSkeletonRows />;
  }

  if (state === "error") {
    return <ScheduleErrorState />;
  }

  if (!assignments.length) {
    return <ScheduleEmptyState />;
  }

  return (
    <div className="space-y-3 pt-2">
      <div className={`hidden text-[10px] uppercase tracking-[0.4em] text-white/40 sm:grid ${GRID_TEMPLATE}`}>
        <span>Crew</span>
        <span>Role</span>
        <ScheduleTimelineAxis timelineMarks={timelineMarks} />
        <span>Station</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-white/10 border-y border-white/15">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className={`grid ${GRID_TEMPLATE} items-center gap-3 px-1 py-4 text-sm transition sm:px-2 ${
              highlightedId === assignment.id ? "bg-white/5" : "bg-transparent"
            }`}
            onPointerEnter={() => onHighlight?.(assignment.id)}
            onPointerLeave={() => onHighlight?.(null)}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 whitespace-nowrap text-base font-medium text-white">
                <span className="truncate">{assignment.staffName}</span>
                <FocusBadge focus={assignment.focus} />
              </div>
              <p className="text-xs text-white/60">{assignment.note}</p>
              <p className="text-[11px] text-white/50 sm:hidden">{formatTimeRange(assignment.start, assignment.end)}</p>
            </div>
            <p className="whitespace-nowrap text-xs text-white/70">{assignment.role}</p>
            <ShiftWindow
              start={assignment.start}
              end={assignment.end}
              timelineMarks={timelineMarks}
            />
            <p className="whitespace-nowrap text-xs text-white/70">{assignment.station}</p>
            <div className="flex flex-col items-start gap-2 text-xs text-white/70 sm:items-end">
              <span className="flex items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.35em]">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[assignment.status].dotClass}`} />
                {STATUS_META[assignment.status].label}
              </span>
              <button
                type="button"
                onClick={() => onEditShift?.(assignment)}
                className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50"
              >
                Edit shift
              </button>
              <Link
                prefetch={false}
                href={buildReflectionHref(assignment.id, assignment.start)}
                className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50"
              >
                View reflections
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleLegend() {
  return (
    <footer className="mt-6 border-t border-white/10 pt-4 text-xs text-white/60">
      <div className="flex flex-wrap items-center gap-6">
        {SHIFT_STATUS_VALUES.map((status) => (
          <ScheduleLegendItem
            key={status}
            dot={<span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].dotClass}`} />}
            title={
              <span className="text-[11px] uppercase tracking-[0.4em] text-white/70">
                {STATUS_META[status].label}
              </span>
            }
            detail={STATUS_META[status].copy}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {SHIFT_FOCUS_ORDER.map((focus) => (
          <span
            key={focus}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.35em] ${FOCUS_META[focus].tint}`}
          >
            {FOCUS_META[focus].label}
          </span>
        ))}
      </div>
    </footer>
  );
}

function ScheduleLegendItem({
  dot,
  title,
  detail,
}: {
  dot: ReactNode;
  title: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {dot}
      {title}
      <span className="text-white/40">{detail}</span>
    </div>
  );
}

function ScheduleTimelineAxis({ timelineMarks }: { timelineMarks: string[] }) {
  return (
    <div className="relative hidden h-10 items-end sm:flex">
      <div className="absolute inset-0 flex">
        {timelineMarks.slice(0, -1).map((_, index) => (
          <div
            key={`divider-${index}`}
            className="flex-1 border-l border-white/10 first:border-l-0 last:border-r last:border-white/10"
          />
        ))}
      </div>
      <div className="relative grid w-full grid-cols-[repeat(8,minmax(0,1fr))] text-[10px] text-white/40">
        {timelineMarks.map((mark) => (
          <span
            key={mark}
            className="whitespace-nowrap text-center"
          >
            {mark}
          </span>
        ))}
      </div>
    </div>
  );
}

function ShiftWindow({ start, end, timelineMarks }: { start: string; end: string; timelineMarks: string[] }) {
  const [startPercent, widthPercent] = computeShiftOffsets(start, end);

  return (
    <div className="relative hidden min-h-[3.5rem] overflow-hidden sm:flex sm:flex-col sm:justify-center">
      <div className="absolute inset-0 flex">
        {timelineMarks.slice(0, -1).map((_, index) => (
          <div
            key={`lane-${index}`}
            className="flex-1 border-l border-white/5 first:border-l-0 last:border-r last:border-white/5"
          />
        ))}
      </div>
      <div
        className="relative rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs text-white shadow-[0_6px_20px_rgba(255,255,255,0.08)]"
        style={{
          marginLeft: `${startPercent}%`,
          width: `${widthPercent}%`,
        }}
      >
        <p className="whitespace-nowrap text-[11px] uppercase tracking-[0.3em] text-white/80">
          {formatTimeRange(start, end)}
        </p>
      </div>
    </div>
  );
}

function ScheduleSkeletonRows() {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={`skeleton-${item}`}
          className="h-16 animate-pulse rounded-full bg-white/5"
        />
      ))}
    </div>
  );
}

function ScheduleEmptyState() {
  return (
    <div className="border border-dashed border-white/20 px-4 py-10 text-center text-xs uppercase tracking-[0.4em] text-white/50">
      No assignments yet · pull from owner schedule.
    </div>
  );
}

function ScheduleErrorState() {
  return (
    <div className="border border-rose-400/40 bg-rose-400/5 px-4 py-6 text-center text-xs uppercase tracking-[0.4em] text-rose-100">
      Unable to load schedule · retry soon.
    </div>
  );
}

function FocusBadge({ focus }: { focus: ShiftFocus }) {
  const meta = FOCUS_META[focus];
  return (
    <span className={`hidden rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.35em] sm:inline-flex ${meta.tint}`}>
      {meta.label}
    </span>
  );
}

function computeShiftOffsets(start: string, end: string): [number, number] {
  const startPercent = timelinePercent(start);
  const endPercent = timelinePercent(end);
  const rawWidth = Math.max(endPercent - startPercent, 3);
  const clampedStart = Math.max(0, Math.min(startPercent, 100));
  const availableWidth = 100 - clampedStart;
  const widthPercent = Math.min(rawWidth, availableWidth);
  return [clampedStart, widthPercent];
}

function formatTimeRange(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startDate = new Date(Date.UTC(2024, 0, 1, startHour, startMinute));
  const endDate = new Date(Date.UTC(2024, 0, 1, endHour, endMinute));
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes < startMinutes) {
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function timelinePercent(time: string) {
  const normalized = normalizeMinutes(time);
  return ((normalized - DAY_START_MINUTES) / DAY_RANGE_MINUTES) * 100;
}

function normalizeMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  let totalMinutes = hour * 60 + minute;
  if (totalMinutes < DAY_START_MINUTES) {
    totalMinutes += MINUTES_IN_DAY;
  }
  return totalMinutes;
}

function buildReflectionHref(shiftId: string, startIso: string) {
  const params = new URLSearchParams({ scheduleId: shiftId });
  const dateOnly = extractDateParam(startIso);
  if (dateOnly) {
    params.set("datePreset", "custom");
    params.set("start", dateOnly);
    params.set("end", dateOnly);
  }
  return `/staff/reflection?${params.toString()}`;
}

function extractDateParam(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

