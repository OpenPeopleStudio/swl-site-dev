import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/shared/supabase";
import {
  ensureOpenInventorySession,
  fetchCountSessionById,
  fetchInventoryItemById,
} from "@/lib/staff/inventory";
import type { InventoryCountMutationResult, InventoryItemType } from "@/types/inventory";

type CountPayload = {
  itemId?: string;
  itemType?: InventoryItemType;
  quantity?: number;
  sessionId?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as CountPayload;
    if (!payload.itemId || !payload.itemType) {
      return NextResponse.json({ error: "Missing item context" }, { status: 400 });
    }

    const quantity = typeof payload.quantity === "number" ? payload.quantity : Number(payload.quantity);
    if (!Number.isFinite(quantity)) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    let session = payload.sessionId ? await fetchCountSessionById(payload.sessionId) : null;
    if (!session) {
      session = await ensureOpenInventorySession();
    }
    const sessionId = session.id;

    const supabase = getSupabaseAdmin();
    if (payload.itemType === "alcohol") {
      const { error: alcoholError } = await supabase.rpc("record_alcohol_count", {
        p_item_id: payload.itemId,
        p_bottle_count: quantity,
        p_open_volume: null,
      });
      if (alcoholError) {
        console.error("record_alcohol_count failed", alcoholError);
        return NextResponse.json({ error: "Unable to persist count" }, { status: 500 });
      }
    } else {
      const { error: countError } = await supabase.rpc("record_food_count", {
        p_item_id: payload.itemId,
        p_counted_quantity: quantity,
      });
      if (countError) {
        console.error("record_food_count failed", countError);
        return NextResponse.json({ error: "Unable to persist count" }, { status: 500 });
      }
    }

    const updatedItem = await fetchInventoryItemById(payload.itemId, payload.itemType);
    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found after count" }, { status: 404 });
    }

    const variance =
      typeof updatedItem.parLevel === "number"
        ? Number((quantity - updatedItem.parLevel).toFixed(2))
        : null;

    const { error: entryError } = await supabase.from("inventory_count_session_entries").insert({
      session_id: sessionId,
      item_type: payload.itemType,
      item_id: payload.itemId,
      counted_quantity: quantity,
      variance,
      notes: payload.notes ?? null,
    });
    if (entryError) {
      console.error("inventory_count_session_entries insert failed", entryError);
    }

    const refreshedSession = await fetchCountSessionById(sessionId);
    const response: InventoryCountMutationResult = {
      item: updatedItem,
      session: refreshedSession ?? session,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("inventory count mutation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

