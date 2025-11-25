import { Suspense } from "react";
import { ScheduleConsole } from "./ScheduleConsole";
import { loadScheduleAction, createShiftAction, updateShiftAction, saveTimezonePreferenceAction } from "./actions";
import { fetchScheduleForDate } from "@/lib/staff/schedule";
import { getStaffTimezonePreference } from "@/lib/staff/preferences";
import { SHIFT_FOCUS_ORDER, type ShiftFocus } from "@/domains/staff/schedule/types";

type SchedulePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const rawDateParam = searchParams?.date;
  const dateParam = parseDateParam(rawDateParam);
  const focusParam = parseFocusParam(searchParams?.focus);
  const staffIds = parseStaffParam(searchParams?.staff);
  const highlightId = parseHighlightParam(searchParams?.highlight);
  const dateProvided = typeof rawDateParam === "string";
  const timezonePreference = await getStaffTimezonePreference();
  const windowRange = timezonePreference ? resolveWindowForTimezone(dateParam, timezonePreference) : undefined;

  const initialData = await fetchScheduleForDate({
    date: dateParam,
    focus: focusParam,
    staffIds: staffIds.length ? staffIds : undefined,
    windowStartIso: windowRange?.start,
    windowEndIso: windowRange?.end,
  });

  return (
    <Suspense fallback={<SchedulePageFallback />}>
      <ScheduleConsole
        initialDateISO={dateParam}
        initialFocus={focusParam}
        initialStaffIds={staffIds}
        initialData={initialData}
        initialDateFromQuery={dateProvided}
        initialTimezone={timezonePreference}
        initialHighlightId={highlightId ?? null}
        loadScheduleAction={loadScheduleAction}
        createShiftAction={createShiftAction}
        updateShiftAction={updateShiftAction}
        saveTimezonePreference={saveTimezonePreferenceAction}
      />
    </Suspense>
  );
}

function parseDateParam(value: unknown) {
  const fallback = formatDateKey(new Date());
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback;
}

const FOCUS_SET = new Set<ShiftFocus>(SHIFT_FOCUS_ORDER);

function parseFocusParam(value: unknown): ShiftFocus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return undefined;
  return FOCUS_SET.has(candidate as ShiftFocus) ? (candidate as ShiftFocus) : undefined;
}

function parseStaffParam(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return [];
  return candidate
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseHighlightParam(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return undefined;
  return candidate.trim() || undefined;
}

function resolveWindowForTimezone(dateKey: string, timezone: string) {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return undefined;
  }
  try {
    const offsetMs = getTimezoneOffsetMs(base, timezone);
    const start = new Date(base.getTime() - offsetMs);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  } catch {
    return undefined;
  }
}

function getTimezoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  const required = ["year", "month", "day", "hour", "minute", "second"] as const;
  if (!required.every((key) => typeof lookup[key] === "string")) {
    throw new Error("Unable to derive timezone offset");
  }
  const localUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return localUtc - date.getTime();
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SchedulePageFallback() {
  return (
    <div className="w-full max-w-6xl text-white">
      <div className="mb-6 h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
      <div className="space-y-3">
        {["a", "b", "c", "d"].map((token) => (
          <div
            key={`schedule-skeleton-${token}`}
            className="h-16 animate-pulse rounded-full border border-white/5 bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

