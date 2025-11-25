import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

export async function POST() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thirtyDaysOut = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString().slice(0, 10);

  const { data: upcoming } = await supabase
    .from("private_events")
    .select("id, guest_name, preferred_date, status")
    .gte("preferred_date", today)
    .lte("preferred_date", thirtyDaysOut);

  const { data: completed } = await supabase
    .from("private_events")
    .select("id")
    .eq("status", "completed")
    .eq("reflection_prompt_sent", false);

  const reminders = upcoming?.filter(
    (event) => event.status === "proposal_sent",
  );

  const reflections = completed ?? [];

  return NextResponse.json({
    reminders: reminders?.length ?? 0,
    reflections: reflections.length,
    message: "Event orchestrator placeholder executed.",
  });
}
