"use server";

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabase";
import OwnerSchedulingConsole from "@/components/staff/OwnerSchedulingConsole";

async function ensureOwner() {
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

export default async function OwnerConsolePage() {
  await ensureOwner();

  return (
    <main
      className="owner-shell min-h-screen bg-[#010206] text-white"
      data-shell="owner"
    >
      <div className="owner-shell__inner">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Owner Console</p>
          <h1 className="text-4xl font-light tracking-[0.25em]">
            Mission Control · Snow White Laundry
          </h1>
          <p className="text-white/60">
            Private scheduling cockpit for Tom + Ken — forecast, build, delegate, and feel the
            pulse.
          </p>
        </header>
        <OwnerSchedulingConsole />
      </div>
    </main>
  );
}
