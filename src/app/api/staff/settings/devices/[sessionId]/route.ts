"use server";

import { NextResponse } from "next/server";
import { loadStaffSettings, requireStaffSettingsContext, revokeDeviceSession } from "@/lib/staff/settingsService";

type Params = {
  sessionId: string;
};

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await revokeDeviceSession(context, params.sessionId);
    const payload = await loadStaffSettings(context);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[settings] device revoke failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

