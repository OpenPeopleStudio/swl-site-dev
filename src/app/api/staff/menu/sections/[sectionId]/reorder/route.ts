"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

type Direction = "up" | "down";
const ALLOWED_ROLES = new Set(["staff", "manager", "owner"]);

export async function PATCH(
  request: Request,
  { params }: { params: { sectionId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    itemId?: string;
    direction?: Direction;
  } | null;

  if (!params.sectionId || !body?.itemId || !isValidDirection(body.direction)) {
    return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entries, error } = await supabase
      .from("menu_section_items")
      .select("item_id, sort_index")
      .eq("section_id", params.sectionId)
      .order("sort_index", { ascending: true });

    if (error) throw error;
    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Section has no items" }, { status: 404 });
    }

    const currentIndex = entries.findIndex((entry) => entry.item_id === body.itemId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Item not part of section" }, { status: 400 });
    }

    const targetIndex =
      body.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) {
      return NextResponse.json({ error: "Reorder out of bounds" }, { status: 409 });
    }

    const current = entries[currentIndex];
    const target = entries[targetIndex];

    await Promise.all([
      supabase
        .from("menu_section_items")
        .update({ sort_index: target.sort_index })
        .eq("section_id", params.sectionId)
        .eq("item_id", current.item_id),
      supabase
        .from("menu_section_items")
        .update({ sort_index: current.sort_index })
        .eq("section_id", params.sectionId)
        .eq("item_id", target.item_id),
    ]);

    const { data: updatedOrder, error: refreshError } = await supabase
      .from("menu_section_items")
      .select("item_id, sort_index")
      .eq("section_id", params.sectionId)
      .order("sort_index", { ascending: true });

    if (refreshError) throw refreshError;

    return NextResponse.json({ items: updatedOrder });
  } catch (error) {
    console.error("Menu reorder failed", error);
    return NextResponse.json({ error: "Unable to reorder section" }, { status: 500 });
  }
}

function isValidDirection(value: unknown): value is Direction {
  return value === "up" || value === "down";
}

