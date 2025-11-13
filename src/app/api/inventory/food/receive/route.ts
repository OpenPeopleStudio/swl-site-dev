import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type ReceivePayload = {
  itemId: string;
  quantity: number;
  unitType?: string;
  costPerUnit?: number;
  vendorId?: string;
  invoiceRef?: string;
  receivedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReceivePayload;
    if (!body.itemId || !body.quantity) {
      return NextResponse.json(
        { error: "itemId and quantity are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_food_receiving", {
      p_item_id: body.itemId,
      p_quantity: body.quantity,
      p_unit_type: body.unitType ?? null,
      p_cost_per_unit: body.costPerUnit ?? null,
      p_vendor_id: body.vendorId ?? null,
      p_invoice_ref: body.invoiceRef ?? null,
      p_received_by: body.receivedBy ?? null,
      p_notes: body.notes ?? null,
      p_metadata: body.metadata ?? {},
    });

    if (error) {
      console.error("record_food_receiving failed", error);
      return NextResponse.json(
        { error: "Unable to record receiving event" },
        { status: 500 },
      );
    }

    return NextResponse.json(data?.[0] ?? {});
  } catch (err) {
    console.error("Food receiving endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
