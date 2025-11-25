export type ReflectionTag = "service" | "prep" | "team" | "incident" | "win" | string;
export type ReflectionSentiment = "calm" | "alert" | "critical" | "celebration" | "warm" | string;

export interface ReflectionEntry {
  id: string;
  staffId?: string;
  staffName: string;
  role?: string;
  shiftLabel?: string;
  tags: ReflectionTag[];
  createdAt: string;
  body: string;
  context?: string;
  sentiment?: ReflectionSentiment;
  scheduleEntryId?: string | null;
  eventId?: string | null;
  referenceUrl?: string | null;
}

export type ReflectionDatePreset = "today" | "week" | "month" | "custom";

export interface ReflectionFilters {
  datePreset: ReflectionDatePreset;
  staffId: string | "all";
  tag: ReflectionTag | "all";
  shift: string | "all";
  query: string;
  startDate?: string;
  endDate?: string;
  scheduleEntryId?: string;
  eventId?: string;
}

export type ReflectionStatus = "idle" | "loading" | "error";

export interface ReflectionPrompt {
  id: string;
  text: string;
  cadence?: string;
  tags?: ReflectionTag[];
  audience?: string;
  sortOrder?: number;
}

export interface ReflectionTagCatalogEntry {
  slug: ReflectionTag;
  label: string;
  tone?: ReflectionSentiment;
  accentColor?: string;
  description?: string;
}

export type ReflectionRow = {
  id: string;
  owner: string | null;
  summary: string | null;
  tags: string[] | null;
  created_at: string | null;
  role: string | null;
  shift_label: string | null;
  context: string | null;
  sentiment: string | null;
  staff_id: string | null;
  schedule_entry_id: string | null;
  event_id: string | null;
  reference_url: string | null;
};

