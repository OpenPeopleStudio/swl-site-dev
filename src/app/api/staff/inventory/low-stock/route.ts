import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/shared/supabase";
import type { InventoryItemType } from "@/types/inventory";

type LowStockPayload = {
  items?: Array<{ id: string; itemType: InventoryItemType; quantity: number }>;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as LowStockPayload;
    const items = payload.items ?? [];
    if (items.length === 0) {
      return NextResponse.json({ error: "No low-stock items provided" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const rows = items.map((item) => ({
      item_type: item.itemType,
      item_id: item.id,
      alert_type: "low_stock",
      severity: "warning",
      message: `Below par · ${item.quantity}`,
      metadata: {
        source: "staff-console",
      },
    }));

    const { error } = await supabase.from("cost_alerts").insert(rows);
    if (error) {
      console.error("low-stock alert insert failed", error);
      return NextResponse.json({ error: "Unable to log low-stock alerts" }, { status: 500 });
    }

    return NextResponse.json({ recorded: rows.length });
  } catch (error) {
    console.error("low-stock notification failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

