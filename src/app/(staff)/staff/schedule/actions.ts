"use server";

import { revalidatePath } from "next/cache";
import { fetchScheduleForDate, createShift, updateShift } from "@/lib/staff/schedule";
import { supabaseServer } from "@/lib/shared/supabaseServer";
import {
  type ScheduleLoadArgs,
  type ShiftComposerServerPayload,
} from "@/domains/staff/schedule/types";

export async function loadScheduleAction(args: ScheduleLoadArgs) {
  return fetchScheduleForDate(args);
}

export async function createShiftAction(payload: ShiftComposerServerPayload) {
  await createShift(payload);
  revalidatePath("/staff/schedule");
}

export async function updateShiftAction(payload: ShiftComposerServerPayload & { id: string }) {
  await updateShift(payload.id, payload);
  revalidatePath("/staff/schedule");
}

export async function saveTimezonePreferenceAction(timezone: string) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("staff_preferences")
    .upsert(
      {
        staff_id: user.id,
        timezone,
      },
      { onConflict: "staff_id" },
    )
    .select()
    .maybeSingle();
  if (error && error.code !== "42P01") {
    console.error("[schedule] saveTimezonePreferenceAction error", error);
  }
}

