import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type WastePayload = {
  itemId: string;
  quantity: number;
  unitType?: string;
  reason?: string;
  staffId?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WastePayload;
    if (!body.itemId || !body.quantity) {
      return NextResponse.json(
        { error: "itemId and quantity are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_food_waste", {
      p_item_id: body.itemId,
      p_quantity_lost: body.quantity,
      p_unit_type: body.unitType ?? null,
      p_reason: body.reason ?? null,
      p_staff_id: body.staffId ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) {
      console.error("record_food_waste failed", error);
      return NextResponse.json(
        { error: "Unable to log waste" },
        { status: 500 },
      );
    }

    return NextResponse.json(data?.[0] ?? {});
  } catch (err) {
    console.error("Food waste endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
