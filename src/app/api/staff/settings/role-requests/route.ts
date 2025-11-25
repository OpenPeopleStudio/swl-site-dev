"use server";

import { NextResponse } from "next/server";
import type { SettingsRole } from "@/components/settings/types";
import {
  createRoleChangeRequest,
  loadStaffSettings,
  requireStaffSettingsContext,
} from "@/lib/staff/settingsService";

export async function POST(request: Request) {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestedRole, reason } = (await request.json()) as {
      requestedRole?: SettingsRole;
      reason?: string;
    };

    if (!requestedRole) {
      return NextResponse.json({ error: "requestedRole is required" }, { status: 400 });
    }

    await createRoleChangeRequest(context, { requestedRole, reason });

    const payload = await loadStaffSettings(context);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[settings] role request failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

