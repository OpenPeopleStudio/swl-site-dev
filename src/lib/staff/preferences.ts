"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/shared/supabaseServer";

export async function getStaffTimezonePreference() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("staff_preferences")
    .select("timezone")
    .eq("staff_id", user.id)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[schedule] staff timezone lookup error", error);
    }
    return null;
  }

  return data?.timezone ?? null;
}

function isMissingTableError(error: PostgrestError | null) {
  return Boolean(error && error.code === "42P01");
}

