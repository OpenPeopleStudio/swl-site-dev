import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type CountPayload = {
  itemId: string;
  quantity: number;
  staffId?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CountPayload;
    if (!body.itemId || typeof body.quantity !== "number") {
      return NextResponse.json(
        { error: "itemId and quantity are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_food_count", {
      p_item_id: body.itemId,
      p_counted_quantity: body.quantity,
      p_staff_id: body.staffId ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) {
      console.error("record_food_count failed", error);
      return NextResponse.json(
        { error: "Unable to record count" },
        { status: 500 },
      );
    }

    return NextResponse.json(data?.[0] ?? {});
  } catch (err) {
    console.error("Food count endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
