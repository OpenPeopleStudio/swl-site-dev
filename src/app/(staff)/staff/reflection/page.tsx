import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { ReflectionPageClient } from "./ReflectionPageClient";
import type { ReflectionEntry, ReflectionFilters, ReflectionPrompt, ReflectionRow } from "./reflection.types";

type ReflectionPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const FALLBACK_REFLECTIONS: ReflectionEntry[] = [
  {
    id: "reflection-1",
    staffName: "Tom Reyes",
    role: "Service Captain",
    shiftLabel: "Dinner · 2nd seating",
    tags: ["service", "team"],
    createdAt: new Date().toISOString(),
    body: "Reload stop added 8 minutes; automation text fired correctly. Need faster manifest share.",
    context: "Route 4B micro-delay",
    sentiment: "alert",
  },
  {
    id: "reflection-2",
    staffName: "Ranya Du",
    role: "Prep Lead",
    shiftLabel: "Prep · 14:00 window",
    tags: ["prep", "incident"],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    body: "Pressure sensor drifted 2%. Reset with manual override. Capture trending metrics nightly.",
    context: "Foam injector recalibration",
    sentiment: "calm",
  },
  {
    id: "reflection-3",
    staffName: "Ken Alcott",
    role: "Menu Systems",
    shiftLabel: "Service · Menu review",
    tags: ["menu", "win"],
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    body: "Guests need immediate allergen callouts. Request surfaced to Menu Builder backlog.",
    context: "Menu allergen visibility",
    sentiment: "celebration",
  },
];

const FALLBACK_PROMPTS: ReflectionPrompt[] = [
  { id: "prompt-1", text: "What slowed the floor down this block?", cadence: "Shift start", tags: ["service", "incident"] },
  { id: "prompt-2", text: "Who needs backup before 22:00?", cadence: "Pre-service", tags: ["team", "service"] },
  { id: "prompt-3", text: "Which menu items should be paused tonight?", cadence: "Menu huddle", tags: ["prep", "service"] },
];

async function loadReflections(filters: ReflectionFilters): Promise<ReflectionEntry[]> {
  const supabase = getSupabaseAdmin();
  try {
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
      )
      .order("created_at", { ascending: false })
      .limit(100);

    const { start, end } = resolveDateBounds(filters);
    if (start) {
      query.gte("created_at", start);
    }
    if (end) {
      query.lte("created_at", end);
    }
    if (filters.staffId !== "all") {
      query.eq("staff_id", filters.staffId);
    }
    if (filters.scheduleEntryId) {
      query.eq("schedule_entry_id", filters.scheduleEntryId);
    }
    if (filters.eventId) {
      query.eq("event_id", filters.eventId);
    }
    if (filters.tag !== "all") {
      query.contains("tags", [filters.tag]);
    }
    if (filters.shift !== "all") {
      query.ilike("shift_label", `%${filters.shift}%`);
    }
    if (filters.query.trim()) {
      const term = filters.query.trim();
      query.or(
        [
          `summary.ilike.%${term}%`,
          `context.ilike.%${term}%`,
          `owner.ilike.%${term}%`,
          `shift_label.ilike.%${term}%`,
        ].join(","),
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed loading reflections", error);
      return FALLBACK_REFLECTIONS;
    }
    const rows = (data ?? []) as unknown as ReflectionRow[];
    if (rows.length === 0) {
      return FALLBACK_REFLECTIONS;
    }
    return rows.map((row) => ({
      id: row.id,
      staffName: row.owner ?? "Crew member",
      staffId: row.staff_id ?? undefined,
      body: row.summary ?? "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      createdAt: row.created_at ?? new Date().toISOString(),
      role: row.role ?? undefined,
      shiftLabel: row.shift_label ?? undefined,
      context: row.context ?? undefined,
      sentiment: row.sentiment ?? undefined,
      scheduleEntryId: row.schedule_entry_id ?? undefined,
      eventId: row.event_id ?? undefined,
      referenceUrl: row.reference_url ?? undefined,
    }));
  } catch (error) {
    console.error("Failed loading reflections", error);
    return FALLBACK_REFLECTIONS;
  }
}

async function loadPrompts(): Promise<ReflectionPrompt[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reflection_prompts")
    .select("id, text, cadence, tags, audience, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed loading reflection prompts", error);
    return FALLBACK_PROMPTS;
  }

  if (!data || data.length === 0) {
    return FALLBACK_PROMPTS;
  }

  return data.map((row) => ({
    id: row.id,
    text: row.text,
    cadence: row.cadence ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    audience: row.audience ?? undefined,
    sortOrder: row.sort_order ?? undefined,
  }));
}

export default async function ReflectionPage({ searchParams = {} }: ReflectionPageProps) {
  const initialFilters = resolveInitialFilters(searchParams);
  const [reflections, prompts] = await Promise.all([loadReflections(initialFilters), loadPrompts()]);

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 lg:px-10 xl:px-6 2xl:px-8 py-10 sm:py-12 md:py-16">
        <PageHeader title="Reflections" subtitle="Calm mission log for service, prep, and personal notes." />
        <p className="mt-4 text-base text-white/70 md:text-lg lg:max-w-3xl">
          Follow the breadcrumbs of intention. Scan shifts, tag themes, and keep the restaurant&rsquo;s memory in orbit.
        </p>
        <ReflectionPageClient reflections={reflections} prompts={prompts} initialFilters={initialFilters} />
      </div>
    </SiteShell>
  );
}

function resolveInitialFilters(searchParams: Record<string, string | string[] | undefined>): ReflectionFilters {
  const preset = pickParam(searchParams, "datePreset");
  const staffId = pickParam(searchParams, "staffId");
  const tag = pickParam(searchParams, "tag");
  const shift = pickParam(searchParams, "shift");
  const query = pickParam(searchParams, "query");
  const startDate = pickParam(searchParams, "start");
  const endDate = pickParam(searchParams, "end");
  const scheduleId = pickParam(searchParams, "scheduleId");
  const eventId = pickParam(searchParams, "eventId");

  const filters: ReflectionFilters = {
    datePreset: isPreset(preset) ? preset : "week",
    staffId: staffId || "all",
    tag: (tag ?? "all") as ReflectionFilters["tag"],
    shift: shift ?? "all",
    query: query ?? "",
  };

  if (startDate) {
    filters.startDate = startDate;
  }
  if (endDate) {
    filters.endDate = endDate;
  }
  if (scheduleId) {
    filters.scheduleEntryId = scheduleId;
  }
  if (eventId) {
    filters.eventId = eventId;
  }
  return filters;
}

function pickParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isPreset(value?: string): value is ReflectionFilters["datePreset"] {
  return value === "today" || value === "week" || value === "month" || value === "custom";
}

function resolveDateBounds(filters: ReflectionFilters) {
  if (filters.datePreset === "custom") {
    return {
      start: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
      end: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
    };
  }

  const now = new Date();
  let start = new Date(now);
  if (filters.datePreset === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filters.datePreset === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (filters.datePreset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }
  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}
