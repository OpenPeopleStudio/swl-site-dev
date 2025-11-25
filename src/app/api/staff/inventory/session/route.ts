import { NextResponse } from "next/server";

import { ensureOpenInventorySession, fetchCountSessionById } from "@/lib/staff/inventory";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type SessionPayload = {
  label?: string;
  focusZone?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as SessionPayload;
    const session = await ensureOpenInventorySession(payload.label, payload.focusZone);
    return NextResponse.json(session);
  } catch (error) {
    console.error("inventory session start failed", error);
    return NextResponse.json({ error: "Unable to start session" }, { status: 500 });
  }
}

type SessionPatchPayload = {
  sessionId?: string;
  label?: string;
  focusZone?: string | null;
  status?: "open" | "closed";
};

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as SessionPatchPayload;
    if (!payload.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof payload.label === "string") {
      updates.label = payload.label.trim() || null;
    }
    if (payload.focusZone !== undefined) {
      updates.focus_zone = payload.focusZone?.trim() || null;
    }
    if (payload.status === "closed") {
      updates.status = "closed";
      updates.closed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      const unchanged = await fetchCountSessionById(payload.sessionId);
      return NextResponse.json(unchanged);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("inventory_count_sessions")
      .update(updates)
      .eq("id", payload.sessionId);
    if (error) {
      console.error("inventory session update failed", error);
      return NextResponse.json({ error: "Unable to update session" }, { status: 500 });
    }

    const refreshed = await fetchCountSessionById(payload.sessionId);
    return NextResponse.json(refreshed);
  } catch (error) {
    console.error("inventory session patch error", error);
    return NextResponse.json({ error: "Unable to update session" }, { status: 500 });
  }
}

