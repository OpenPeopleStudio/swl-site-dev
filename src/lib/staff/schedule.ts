import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import {
  SHIFT_FOCUS_ORDER,
  type ScheduleAssignment,
  type ScheduleLoadArgs,
  type SchedulePayload,
  type ShiftComposerServerPayload,
  type ShiftFocus,
  type ShiftStatus,
  type StaffLastShift,
  type StaffOption,
} from "@/domains/staff/schedule/types";

type StaffScheduleRow = {
  id: string;
  staff_id: string | null;
  focus: string | null;
  role: string | null;
  station: string | null;
  status: string | null;
  note: string | null;
  shift_start: string | null;
  shift_end: string | null;
  staff?: {
    id: string | null;
    full_name: string | null;
    role: string | null;
  } | null;
};

type StaffDirectoryRow = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type StaffScheduleMetaRow = {
  staff_id: string;
  focus?: string | null;
  tags?: string[] | null;
};

const SHIFT_STATUS_VALUES: ShiftStatus[] = ["confirmed", "tentative", "open"];
const SHIFT_STATUS_SET = new Set<ShiftStatus>(SHIFT_STATUS_VALUES);
const SHIFT_FOCUS_SET = new Set<ShiftFocus>(SHIFT_FOCUS_ORDER);

function handleMissingTable(error: PostgrestError | null) {
  if (!error) return false;
  if (error.code === "42P01") {
    console.warn("[schedule] Table missing. Ensure Supabase schema is migrated.", error.message);
    return true;
  }
  return false;
}

export const listStaffDirectory = cache(async (): Promise<StaffOption[]> => {
  const supabase = getSupabaseAdmin();
  const [staffResponse, scheduleResponse, metaResponse] = await Promise.all([
    supabase.from("staff").select("id, full_name, role").order("full_name", { ascending: true }),
    supabase
      .from("staff_schedule")
      .select("id, staff_id, focus, role, station, shift_start, shift_end")
      .order("shift_start", { ascending: false })
      .limit(480),
    supabase.from("staff_schedule_meta").select("staff_id, focus, tags"),
  ]);

  if (staffResponse.error) {
    const missing = handleMissingTable(staffResponse.error);
    if (!missing) {
      console.error("[schedule] listStaffDirectory error", staffResponse.error);
    }
  }
  if (scheduleResponse.error && !handleMissingTable(scheduleResponse.error)) {
    console.error("[schedule] listStaffDirectory latest shifts error", scheduleResponse.error);
  }
  if (metaResponse.error && !handleMissingTable(metaResponse.error)) {
    console.error("[schedule] listStaffDirectory meta error", metaResponse.error);
  }

  const latestByStaff = new Map<string, StaffScheduleRow>();
  (scheduleResponse.data ?? []).forEach((row) => {
    if (!row.staff_id || latestByStaff.has(row.staff_id)) return;
    latestByStaff.set(row.staff_id, row as StaffScheduleRow);
  });

  const metaByStaff = new Map<string, StaffScheduleMetaRow>();
  (metaResponse.data ?? []).forEach((row) => {
    if (row.staff_id && !metaByStaff.has(row.staff_id)) {
      metaByStaff.set(row.staff_id, row as StaffScheduleMetaRow);
    }
  });

  const pendingMetaUpserts: StaffScheduleMetaRow[] = [];

  const directory = (staffResponse.data ?? []).map((entry: StaffDirectoryRow) => {
    const latest = entry.id ? latestByStaff.get(entry.id) : undefined;
    const lastShift = latest ? mapRowToLastShift(latest) : null;
    const meta = entry.id ? metaByStaff.get(entry.id) : undefined;
    const explicitFocus = meta?.focus && isShiftFocus(meta.focus) ? meta.focus : undefined;
    const explicitTags = sanitizeTagList(meta?.tags);
    const derivedFocus = explicitFocus ?? lastShift?.focus ?? deriveFocusFromRole(entry.role);
    const tags = mergeTags(explicitTags, deriveStaffTags(entry.role, latest?.station));

    if (!meta && entry.id) {
      pendingMetaUpserts.push({
        staff_id: entry.id,
        focus: derivedFocus,
        tags,
      });
    }

    return {
      id: entry.id,
      name: entry.full_name ?? "Crew",
      defaultRole: entry.role,
      focus: derivedFocus,
      tags,
      lastShift,
    };
  });

  if (pendingMetaUpserts.length && !metaResponse.error) {
    const { error } = await supabase.from("staff_schedule_meta").upsert(pendingMetaUpserts, {
      onConflict: "staff_id",
    });
    if (error && !handleMissingTable(error)) {
      console.error("[schedule] staff meta backfill error", error);
    }
  }

  return directory;
});

export async function fetchScheduleForDate(args: ScheduleLoadArgs): Promise<SchedulePayload> {
  const { date, focus, staffIds, windowStartIso, windowEndIso } = args;
  const supabase = getSupabaseAdmin();
  const { start, end } = windowStartIso && windowEndIso ? { start: windowStartIso, end: windowEndIso } : resolveDateWindow(date);

  const query = supabase
    .from("staff_schedule")
    .select(
      [
        "id",
        "staff_id",
        "focus",
        "role",
        "station",
        "status",
        "note",
        "shift_start",
        "shift_end",
        "staff:staff(id, full_name, role)",
      ].join(","),
    )
    .gte("shift_start", start)
    .lt("shift_start", end)
    .order("shift_start", { ascending: true });

  if (focus) {
    query.eq("focus", focus);
  }
  if (staffIds?.length) {
    query.in("staff_id", staffIds);
  }

  const { data, error } = await query;
  const staffOptions = await listStaffDirectory();

  if (error) {
    const missing = handleMissingTable(error);
    if (!missing) {
      console.error("[schedule] fetchScheduleForDate error", error);
    }
    return {
      assignments: [],
      staffOptions,
      focusOptions: SHIFT_FOCUS_ORDER,
      state: "error",
    };
  }

  const assignments = (data ?? [])
    .map((row) => mapRowToAssignment(row as StaffScheduleRow))
    .filter(Boolean) as ScheduleAssignment[];

  const focusOptions = assignments.length
    ? deriveFocusOptions(assignments)
    : SHIFT_FOCUS_ORDER;

  return {
    assignments,
    staffOptions,
    focusOptions,
    state: assignments.length ? "ready" : "empty",
  };
}

export async function createShift(payload: ShiftComposerServerPayload) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("staff_schedule").insert({
    staff_id: payload.staffId,
    focus: payload.focus,
    role: payload.role,
    station: payload.station,
    status: payload.status,
    note: payload.note ?? null,
    shift_start: payload.startIso,
    shift_end: payload.endIso,
  });

  if (error) {
    console.error("[schedule] createShift error", error);
    throw new Error(error.message);
  }
}

export async function updateShift(id: string, payload: ShiftComposerServerPayload) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("staff_schedule")
    .update({
      staff_id: payload.staffId,
      focus: payload.focus,
      role: payload.role,
      station: payload.station,
      status: payload.status,
      note: payload.note ?? null,
      shift_start: payload.startIso,
      shift_end: payload.endIso,
    })
    .eq("id", id);

  if (error) {
    console.error("[schedule] updateShift error", error);
    throw new Error(error.message);
  }
}

function resolveDateWindow(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function mapRowToAssignment(row: StaffScheduleRow): ScheduleAssignment | null {
  if (!row.shift_start) return null;
  const focus = isShiftFocus(row.focus) ? row.focus : "service";
  const status = isShiftStatus(row.status) ? row.status : "open";
  const start = formatClockLabel(row.shift_start);
  const end = formatClockLabel(row.shift_end ?? row.shift_start);

  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff?.full_name ?? row.staff_id ?? "Crew",
    staffRole: row.staff?.role,
    focus,
    station: row.station ?? "Station",
    role: row.role ?? "Shift",
    start,
    end,
    note: row.note ?? "",
    status,
  };
}

function mapRowToLastShift(row: StaffScheduleRow): StaffLastShift {
  return {
    focus: isShiftFocus(row.focus) ? row.focus : null,
    role: row.role,
    station: row.station,
    start: row.shift_start ? formatClockLabel(row.shift_start) : undefined,
    end: row.shift_end ? formatClockLabel(row.shift_end) : undefined,
  };
}

function isShiftFocus(value?: string | null): value is ShiftFocus {
  if (!value) return false;
  return SHIFT_FOCUS_SET.has(value as ShiftFocus);
}

function isShiftStatus(value?: string | null): value is ShiftStatus {
  if (!value) return false;
  return SHIFT_STATUS_SET.has(value as ShiftStatus);
}

function formatClockLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "00:00";
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function deriveFocusOptions(assignments: ScheduleAssignment[]): ShiftFocus[] {
  const seen = new Set<ShiftFocus>();
  assignments.forEach((assignment) => {
    if (!seen.has(assignment.focus)) {
      seen.add(assignment.focus);
    }
  });
  return SHIFT_FOCUS_ORDER.filter((focus) => seen.has(focus));
}

function sanitizeTagList(values?: string[] | null) {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function mergeTags(primary: string[], secondary: string[]) {
  return Array.from(new Set([...primary, ...secondary]));
}

function deriveStaffTags(role?: string | null, station?: string | null) {
  const tags = new Set<string>();
  if (role) {
    role
      .split(/[·,]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => tags.add(token.toLowerCase()));
  }
  if (station) {
    tags.add(station.toLowerCase());
  }
  return Array.from(tags);
}

function deriveFocusFromRole(role?: string | null): ShiftFocus | null {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized.includes("bar")) return "bar";
  if (normalized.includes("pastry") || normalized.includes("prep")) return "prep";
  if (normalized.includes("host") || normalized.includes("guest") || normalized.includes("concierge")) return "guest";
  if (normalized.includes("ops") || normalized.includes("admin") || normalized.includes("utility")) return "ops";
  if (normalized.includes("service") || normalized.includes("line") || normalized.includes("server")) return "service";
  return null;
}

