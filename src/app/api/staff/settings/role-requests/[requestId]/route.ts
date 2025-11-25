"use server";

import { NextResponse } from "next/server";
import type { RoleChangeStatus } from "@/components/settings/types";
import {
  loadStaffSettings,
  requireStaffSettingsContext,
  resolveRoleChangeRequest,
} from "@/lib/staff/settingsService";

type Params = {
  requestId: string;
};

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { status, note } = (await request.json()) as {
      status?: RoleChangeStatus;
      note?: string;
    };

    if (status !== "approved" && status !== "denied") {
      return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
    }

    await resolveRoleChangeRequest(context, {
      requestId: params.requestId,
      status,
      note,
    });

    const payload = await loadStaffSettings(context);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[settings] verdict error", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

