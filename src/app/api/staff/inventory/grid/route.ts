import { NextResponse } from "next/server";

import { fetchInventorySnapshot } from "@/lib/staff/inventory";

export async function GET() {
  try {
    const snapshot = await fetchInventorySnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("inventory grid fetch failed", error);
    return NextResponse.json({ error: "Unable to load inventory" }, { status: 500 });
  }
}

