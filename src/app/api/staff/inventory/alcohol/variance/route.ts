import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type AlcoholVariancePayload = {
  itemId: string;
  periodStart?: string;
  periodEnd?: string;
  expectedVolume?: number;
  actualVolume?: number;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlcoholVariancePayload;
    if (!body.itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("record_alcohol_variance", {
      p_item_id: body.itemId,
      p_period_start: body.periodStart ?? null,
      p_period_end: body.periodEnd ?? null,
      p_expected_volume: body.expectedVolume ?? null,
      p_actual_volume: body.actualVolume ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) {
      console.error("record_alcohol_variance failed", error);
      return NextResponse.json(
        { error: "Unable to record variance" },
        { status: 500 },
      );
    }

    return NextResponse.json(data?.[0] ?? {});
  } catch (err) {
    console.error("Alcohol variance endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
