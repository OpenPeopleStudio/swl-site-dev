import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/shared/supabase";
import type { InventoryItemType } from "@/types/inventory";

type InventoryNotePayload = {
  itemId?: string;
  itemType?: InventoryItemType;
  body?: string;
  tags?: string[];
  authorName?: string;
  sessionId?: string | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as InventoryNotePayload;
    if (!payload.itemId || !payload.itemType) {
      return NextResponse.json({ error: "Missing inventory context" }, { status: 400 });
    }
    const trimmedBody = payload.body?.trim();
    if (!trimmedBody) {
      return NextResponse.json({ error: "Note body is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const table =
      payload.itemType === "alcohol" ? "alcohol_inventory_items" : "food_inventory_items";

    let authorId: string | null = null;
    const authorName = payload.authorName?.trim();
    if (authorName) {
      const { data: staffMatch } = await supabase
        .from("staff")
        .select("id")
        .ilike("full_name", authorName)
        .limit(1)
        .maybeSingle();
      authorId = staffMatch?.id ?? null;
    }

    const sessionTag = payload.sessionId ? [`session:${payload.sessionId}`] : [];
    const tags = Array.isArray(payload.tags)
      ? [...new Set(payload.tags.filter(Boolean)), ...sessionTag]
      : sessionTag;

    const { data, error } = await supabase
      .from("inventory_notes")
      .insert({
        author_id: authorId,
        note: trimmedBody,
        related_module: "inventory",
        related_table: table,
        related_id: payload.itemId,
        tags,
      })
      .select("id")
      .single();

    if (error) {
      console.error("inventory note insert failed", error);
      return NextResponse.json({ error: "Unable to record note" }, { status: 500 });
    }

    if (payload.sessionId) {
      await supabase
        .from("inventory_notes_links")
        .insert({
          note_id: data.id,
          link_type: "count_session",
          target_table: "inventory_count_sessions",
          target_id: payload.sessionId,
        })
        .throwOnError();
    }

    return NextResponse.json({ noteId: data.id });
  } catch (error) {
    console.error("inventory note route error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

