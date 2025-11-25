"use server";

import { NextResponse } from "next/server";
import { loadStaffSettings, requireStaffSettingsContext, revokeAllDeviceSessions } from "@/lib/staff/settingsService";

export async function POST() {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await revokeAllDeviceSessions(context);
    const payload = await loadStaffSettings(context);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[settings] logout all devices failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

