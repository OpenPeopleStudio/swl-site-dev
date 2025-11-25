import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  saveNotificationSection,
  savePreferencesSection,
  saveProfileSection,
} from "@/lib/staff/settingsService";
import type {
  NotificationSettings,
  SettingsRole,
  StaffPreferences,
  StaffProfileSettings,
} from "@/components/settings/types";

type ValueRecord = Record<string, unknown> | Array<Record<string, unknown>>;
type UpsertCall = { table: string; values: ValueRecord; options?: Record<string, unknown> };
type UpdateCall = { table: string; values: Record<string, unknown>; column?: string; value?: unknown };

class SupabaseStub {
  upserts: UpsertCall[] = [];
  updates: UpdateCall[] = [];
  authUpdates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  auth = {
    admin: {
      updateUserById: async (id: string, payload: Record<string, unknown>) => {
        this.authUpdates.push({ id, payload });
        return { error: null };
      },
    },
  };

  from(table: string) {
    if (table === "user_profiles" || table === "user_preferences" || table === "user_notifications" || table === "role_change_requests") {
      return {
        upsert: async (values: ValueRecord, options?: Record<string, unknown>) => {
          this.upserts.push({ table, values, options });
          return { error: null };
        },
        insert: async (values: ValueRecord) => {
          this.upserts.push({ table, values });
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      };
    }
    if (table === "staff") {
      return {
        update: (values: Record<string, unknown>) => ({
          eq: async (column: string, value: unknown) => {
            this.updates.push({ table, values, column, value });
            return { error: null };
          },
        }),
      };
    }
    return {
      upsert: async (values: ValueRecord, options?: Record<string, unknown>) => {
        this.upserts.push({ table, values, options });
        return { error: null };
      },
    };
  }

  rpc() {
    return Promise.resolve({ data: [], error: null });
  }
}

function buildContext(role: SettingsRole = "boh") {
  const supabase = new SupabaseStub();
  return {
    supabase: supabase as unknown as SupabaseClient,
    stub: supabase,
    staffId: "staff-1",
    email: "crew@example.com",
    displayName: "Crew Member",
    settingsRole: role,
    isOwner: role === "owner",
  };
}

test("saveProfileSection upserts profile, updates staff, and syncs auth metadata", async () => {
  const context = buildContext();
  const payload: Partial<StaffProfileSettings> = {
    fullName: "Noor Aurora",
    phoneNumber: "+1 312 555 0119",
    avatarUrl: "https://example.com/avatar.png",
    timezone: "America/Chicago",
    locale: "en-US",
    staffNumber: "swl-204",
  };

  await saveProfileSection(context, payload);

  const profileUpsert = context.stub.upserts.find((entry) => entry.table === "user_profiles");
  expect(profileUpsert?.values).toMatchObject({
    user_id: context.staffId,
    name: payload.fullName,
    phone: payload.phoneNumber,
    photo_url: payload.avatarUrl,
    timezone: payload.timezone,
    locale: payload.locale,
    staff_number: payload.staffNumber,
  });

  const staffUpdate = context.stub.updates.find((entry) => entry.table === "staff");
  expect(staffUpdate?.values).toMatchObject({
    full_name: payload.fullName,
    avatar_url: payload.avatarUrl,
  });
  expect(staffUpdate?.value).toBe(context.staffId);

  expect(context.stub.authUpdates).toHaveLength(1);
  expect(context.stub.authUpdates[0]).toMatchObject({
    id: context.staffId,
    payload: {
      user_metadata: {
        full_name: payload.fullName,
        avatar_url: payload.avatarUrl,
        locale: payload.locale,
        timezone: payload.timezone,
        role: "boh",
      },
    },
  });
});

test("saveNotificationSection maps switches to user_notifications rows", async () => {
  const context = buildContext();
  const payload: NotificationSettings = {
    scheduleChanges: false,
    newReflections: true,
    eventReminders: true,
    inventoryAlerts: false,
    deviceAlerts: true,
    channelEmail: true,
    channelSms: false,
    channelInApp: true,
  };

  await saveNotificationSection(context, payload);

  const notificationUpsert = context.stub.upserts.find((entry) => entry.table === "user_notifications");
  const rows: Array<Record<string, unknown>> = Array.isArray(notificationUpsert?.values)
    ? (notificationUpsert?.values as Array<Record<string, unknown>>)
    : [];
  expect(rows).toHaveLength(8);
  const scheduleRow = rows.find((row) => row.notification_type === "schedule_changes");
  expect(scheduleRow).toMatchObject({
    user_id: context.staffId,
    enabled: false,
  });
});

test("savePreferencesSection upserts the entire preference blob", async () => {
  const context = buildContext();
  const payload: StaffPreferences = {
    defaultLandingPage: "menu",
    density: "compact",
    enableHaptics: true,
    autoAcknowledgeShifts: true,
    ambientSound: false,
    timezone: "America/New_York",
  };

  await savePreferencesSection(context, payload);

  const prefUpsert = context.stub.upserts.find((entry) => entry.table === "user_preferences");
  expect(prefUpsert?.values).toMatchObject({
    user_id: context.staffId,
    preferences: payload,
  });
});

