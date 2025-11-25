import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

type ReportPayload = {
  reportDate?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ReportPayload;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("generate_inventory_health_report", {
      p_report_date: body.reportDate ?? null,
    });

    if (error) {
      console.error("generate_inventory_health_report failed", error);
      return NextResponse.json(
        { error: "Unable to generate report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ reportId: data });
  } catch (err) {
    console.error("Inventory health report endpoint error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
