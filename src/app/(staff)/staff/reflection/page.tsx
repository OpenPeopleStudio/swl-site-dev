import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import type { BoardReflection, ReflectionPrompt } from "@/apps/staff-console/boh/StaffReflectionBoard";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { ReflectionPageClient } from "./ReflectionPageClient";

const FALLBACK_REFLECTIONS: BoardReflection[] = [
  {
    id: "reflection-1",
    title: "Route 4B micro-delay",
    owner: "Tom",
    summary:
      "Reload stop added 8 minutes; automation text fired correctly. Need faster manifest share.",
    tags: ["logistics", "automation"],
    severity: "warning" as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: "reflection-2",
    title: "Foam injector recalibration",
    owner: "Ranya",
    summary:
      "Pressure sensor drifted 2%. Reset with manual override. Capture trending metrics nightly.",
    tags: ["maintenance"],
    severity: "info" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "reflection-3",
    title: "Menu allergen visibility",
    owner: "Ken",
    summary:
      "Guests need immediate allergen callouts. Request surfaced to Menu Builder backlog.",
    tags: ["menu", "guest"],
    severity: "critical" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
];

const prompts: ReflectionPrompt[] = [
  { id: "prompt-1", text: "What slowed the floor down this block?", cadence: "Shift start" },
  { id: "prompt-2", text: "Who needs backup before 22:00?", cadence: "Pre-service" },
  { id: "prompt-3", text: "Which menu items should be paused tonight?", cadence: "Menu huddle" },
];

async function loadReflections(): Promise<BoardReflection[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staff_reflections")
    .select("id, owner, title, summary, tags, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) {
    console.error("Failed loading reflections", error);
    return FALLBACK_REFLECTIONS;
  }
  if (!data || data.length === 0) {
    return FALLBACK_REFLECTIONS;
  }
  return data.map((row) => ({
    id: row.id,
    owner: row.owner,
    title: row.title ?? undefined,
    summary: row.summary,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
  }));
}

export default async function ReflectionPage() {
  const reflections = await loadReflections();

  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16" style={{ maxWidth: "1800px" }}>
      <PageHeader
        title="Reflection"
        subtitle="Daily System Feedback"
      />

      <GlassSection delay={0.3}>
        <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
          Capture daily system feedback so tomorrow launches on time. Document moments, decisions, and improvements.
        </p>

        <ReflectionPageClient reflections={reflections} prompts={prompts} />
      </GlassSection>
    </div>
  );
}
