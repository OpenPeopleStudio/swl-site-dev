export type ShiftFocus = "service" | "prep" | "guest" | "ops" | "bar";

export const SHIFT_FOCUS_ORDER: ShiftFocus[] = ["service", "prep", "guest", "bar", "ops"];

export type ShiftStatus = "confirmed" | "tentative" | "open";

export type ScheduleState = "ready" | "loading" | "empty" | "error";

export type ScheduleAssignment = {
  id: string;
  staffId: string | null;
  staffName: string;
  staffRole?: string | null;
  focus: ShiftFocus;
  station: string;
  role: string;
  start: string;
  end: string;
  note: string;
  status: ShiftStatus;
};

export type StaffLastShift = {
  focus?: ShiftFocus | null;
  role?: string | null;
  station?: string | null;
  start?: string | null;
  end?: string | null;
};

export type StaffOption = {
  id: string;
  name: string;
  defaultRole?: string | null;
  focus?: ShiftFocus | null;
  tags?: string[];
  lastShift?: StaffLastShift | null;
};

export type SchedulePayload = {
  assignments: ScheduleAssignment[];
  staffOptions: StaffOption[];
  focusOptions: ShiftFocus[];
  state: ScheduleState;
};

export type ScheduleSummary = {
  crewCount: number;
  coverageLabel: string;
  windowLabel: string;
};

export type ScheduleFilters = {
  focus?: ShiftFocus;
  staffIds?: string[];
};

export type ScheduleLoadArgs = {
  date: string;
  focus?: ShiftFocus;
  staffIds?: string[];
  timezone?: string;
  windowStartIso?: string;
  windowEndIso?: string;
};

export type ShiftComposerServerPayload = {
  staffId: string;
  focus: ShiftFocus;
  role: string;
  station: string;
  status: ShiftStatus;
  note?: string;
  startIso: string;
  endIso: string;
};

