"use server";

import { NextResponse } from "next/server";
import type {
  NotificationSettings,
  StaffPreferences,
  StaffProfileSettings,
} from "@/components/settings/types";
import {
  loadStaffSettings,
  requireStaffSettingsContext,
  saveNotificationSection,
  savePreferencesSection,
  saveProfileSection,
} from "@/lib/staff/settingsService";

export async function GET() {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await loadStaffSettings(context);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[settings] load failed", error);
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireStaffSettingsContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { section, payload } = (await request.json()) as {
      section?: string;
      payload?: unknown;
    };

    switch (section) {
      case "profile":
        await saveProfileSection(context, payload as Partial<StaffProfileSettings>);
        break;
      case "notifications":
        await saveNotificationSection(context, payload as NotificationSettings);
        break;
      case "preferences":
        await savePreferencesSection(context, payload as StaffPreferences);
        break;
      default:
        return NextResponse.json({ error: "Unsupported section" }, { status: 400 });
    }

    const updated = await loadStaffSettings(context);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[settings] patch failed", error);
    return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });
  }
}

