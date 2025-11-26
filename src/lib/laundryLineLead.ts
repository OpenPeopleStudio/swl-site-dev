import type { SupabaseClient } from "@supabase/supabase-js";
import type { LaundryLineIntent } from "@/types/laundry-line";

const PRIVATE_EVENT_KEYWORDS = [
  "private event",
  "buyout",
  "wedding",
  "reception",
  "corporate",
  "party",
  "celebration",
];

const VISIT_KEYWORDS = [
  "visit",
  "reservation",
  "table",
  "dinner",
  "book",
  "booking",
  "seating",
  "prelude",
  "opening",
];

const PHILOSOPHY_KEYWORDS = ["philosophy", "intention", "craft", "emotion"];

type IntentHint = "visit" | "private_event" | "philosophy" | "other" | undefined;

export function detectLaundryLineIntent(
  message: string,
  hint?: IntentHint,
): LaundryLineIntent | null {
  const normalized = message.toLowerCase();

  if (hint === "private_event") return "private_event";
  if (hint === "visit") return "visit_prelude";
  if (hint === "philosophy") return "philosophy_only";

  if (PRIVATE_EVENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "private_event";
  }
  if (VISIT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "visit_prelude";
  }
  if (PHILOSOPHY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "philosophy_only";
  }
  return null;
}

export async function maybeCreateLaundryLineLead(params: {
  supabase: SupabaseClient;
  threadId: string;
  intent: LaundryLineIntent;
  notes: string;
}) {
  const { supabase, threadId, intent, notes } = params;

  try {
    const { data: existing } = await supabase
      .from("laundry_line_leads")
      .select("id")
      .eq("thread_id", threadId)
      .eq("notes", notes)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    await supabase.from("laundry_line_leads").insert({
      thread_id: threadId,
      intent,
      notes,
    });
  } catch (error) {
    console.error("Laundry Line lead capture failed", error);
  }
}


