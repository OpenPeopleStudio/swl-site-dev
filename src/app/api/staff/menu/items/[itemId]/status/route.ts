"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

const VALID_STATUSES = new Set(["on", "prep", "eightySixed", "testing"]);
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

  const payload = await request.json().catch(() => null);
  const status = payload?.status;

  if (!params.itemId || typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status payload" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("menu_item_status")
      .insert({
        item_id: params.itemId,
        status,
        source: session.role ?? "staff-console",
      })
      .select("item_id, status, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ status: data });
  } catch (error) {
    console.error("Menu status update failed", error);
    return NextResponse.json({ error: "Unable to update menu status" }, { status: 500 });
  }
}

