"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

const VALID_VISIBILITY = new Set(["guest-facing", "staff-only"]);
const ALLOWED_ROLES = new Set(["staff", "manager", "owner"]);

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const visibility = body?.visibility;

  if (!params.itemId || typeof visibility !== "string" || !VALID_VISIBILITY.has(visibility)) {
    return NextResponse.json({ error: "Invalid visibility payload" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("menu_items")
      .update({ visibility })
      .eq("id", params.itemId)
      .select("id, visibility, last_updated_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Menu visibility toggle failed", error);
    return NextResponse.json({ error: "Unable to update visibility" }, { status: 500 });
  }
}

