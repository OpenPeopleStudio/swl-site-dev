"use server";

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/shared/supabaseServer";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

export async function ensureOwner() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const admin = getSupabaseAdmin();
  const { data: accessRecord } = await admin
    .from("staff_access")
    .select("role")
    .eq("email", user.email ?? "")
    .maybeSingle();

  if (accessRecord?.role !== "owner") {
    notFound();
  }
}
