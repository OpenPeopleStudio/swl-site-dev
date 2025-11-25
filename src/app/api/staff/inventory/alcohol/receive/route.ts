import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type AlcoholReceivePayload = {
  itemId: string;
  bottleCount?: number;
  openVolume?: number;
  costPerBottle?: number;
  vendorId?: string;
  invoiceRef?: string;
  receivedBy?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlcoholReceivePayload;
    if (!body.itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_alcohol_receiving", {
      p_item_id: body.itemId,
      p_bottle_count: body.bottleCount ?? 0,
      p_open_volume: body.openVolume ?? 0,
      p_cost_per_bottle: body.costPerBottle ?? null,
      p_vendor_id: body.vendorId ?? null,
      p_invoice_ref: body.invoiceRef ?? null,
      p_received_by: body.receivedBy ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) {
      console.error("record_alcohol_receiving failed", error);
      return NextResponse.json(
        { error: "Unable to record alcohol receiving" },
        { status: 500 },
      );
    }

    return NextResponse.json(data?.[0] ?? {});
  } catch (err) {
    console.error("Alcohol receiving endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
