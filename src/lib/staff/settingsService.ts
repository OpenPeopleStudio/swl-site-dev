import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessControlState,
  DeviceSession,
  NotificationSettings,
  RoleChangeRequest,
  RoleChangeStatus,
  SettingsRole,
  StaffPreferences,
  StaffProfileSettings,
  StaffSettingsResponse,
} from "@/components/settings/types";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

type StaffSettingsContext = {
  supabase: SupabaseClient;
  staffId: string;
  email: string;
  displayName: string;
  settingsRole: SettingsRole;
  isOwner: boolean;
};

const DEFAULT_PREFERENCES: StaffPreferences = {
  defaultLandingPage: "schedule",
  density: "comfortable",
  enableHaptics: false,
  autoAcknowledgeShifts: false,
  ambientSound: true,
  timezone: "America/Chicago",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  scheduleChanges: true,
  newReflections: true,
  eventReminders: false,
  inventoryAlerts: false,
  deviceAlerts: true,
  channelEmail: true,
  channelSms: false,
  channelInApp: true,
};

const NOTIFICATION_TYPE_MAP: Array<{
  key: keyof NotificationSettings;
  notification_type: string;
}> = [
  { key: "scheduleChanges", notification_type: "schedule_changes" },
  { key: "newReflections", notification_type: "new_reflections" },
  { key: "eventReminders", notification_type: "event_reminders" },
  { key: "inventoryAlerts", notification_type: "inventory_alerts" },
  { key: "deviceAlerts", notification_type: "device_alerts" },
  { key: "channelEmail", notification_type: "channel_email" },
  { key: "channelSms", notification_type: "channel_sms" },
  { key: "channelInApp", notification_type: "channel_in_app" },
];

const REQUESTABLE_ROLES: SettingsRole[] = ["boh", "foh", "manager", "owner"];

export function normalizeSettingsRole(value?: string | null): SettingsRole {
  switch (value) {
    case "boh":
    case "foh":
    case "manager":
    case "owner":
      return value;
    case "staff":
    case "ops":
    case "chef":
      return "boh";
    default:
      return "boh";
  }
}

export async function requireStaffSettingsContext(): Promise<StaffSettingsContext | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const supabase = getSupabaseAdmin();
  const staffResponse = await supabase
    .from("staff")
    .select("id, email, full_name, role")
    .eq("email", session.email)
    .maybeSingle();

  if (staffResponse.error) {
    console.error("[settings] staff lookup failed", staffResponse.error);
    throw new Error("Unable to resolve staff profile");
  }

  if (!staffResponse.data?.id) {
    return null;
  }

  const userRoleResponse = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", staffResponse.data.id)
    .maybeSingle();

  if (userRoleResponse.error) {
    console.warn("[settings] user role lookup failed", userRoleResponse.error.message);
  }

  const derivedRole = normalizeSettingsRole(
    userRoleResponse.data?.role ?? staffResponse.data.role ?? session.role,
  );

  return {
    supabase,
    staffId: staffResponse.data.id,
    email: staffResponse.data.email ?? session.email,
    displayName: staffResponse.data.full_name ?? session.email,
    settingsRole: derivedRole,
    isOwner: derivedRole === "owner",
  };
}

export async function loadStaffSettings(context: StaffSettingsContext): Promise<StaffSettingsResponse> {
  const [profileRow, staffRow, preferencesRow, notificationsRows, sessionRows, myRequestRow, queueRows] =
    await Promise.all([
      context.supabase
        .from("user_profiles")
        .select("name, photo_url, phone, timezone, locale, staff_number")
        .eq("user_id", context.staffId)
        .maybeSingle(),
      context.supabase
        .from("staff")
        .select("full_name, avatar_url, email")
        .eq("id", context.staffId)
        .maybeSingle(),
      context.supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", context.staffId)
        .maybeSingle(),
      context.supabase
        .from("user_notifications")
        .select("notification_type, enabled")
        .eq("user_id", context.staffId),
      context.supabase.rpc("list_user_sessions", { p_user_id: context.staffId }),
      context.supabase
        .from("role_change_requests")
        .select("*")
        .eq("staff_id", context.staffId)
        .order("created_at", { ascending: false })
        .maybeSingle(),
      context.isOwner
        ? context.supabase
            .from("role_change_requests")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  const profile = mapProfile(context, profileRow.data, staffRow.data);
  const preferences = mapPreferences(preferencesRow.data?.preferences);
  const notifications = mapNotifications(notificationsRows.data ?? []);
  const deviceSessions = mapDeviceSessions(sessionRows.data ?? []);

  if (profileRow.error) {
    console.warn("[settings] profile load error", profileRow.error.message);
  }
  if (preferencesRow.error) {
    console.warn("[settings] preferences load error", preferencesRow.error.message);
  }
  if (notificationsRows.error) {
    console.warn("[settings] notifications load error", notificationsRows.error.message);
  }
  if (sessionRows.error) {
    console.warn("[settings] session load error", sessionRows.error.message);
  }

  const accessControl = await buildAccessControlState(
    context,
    myRequestRow.data ? [myRequestRow.data] : [],
    queueRows.data ?? [],
  );

  return {
    profile,
    preferences,
    notifications,
    deviceSessions,
    role: context.settingsRole,
    accessControl,
  };
}

export async function saveProfileSection(
  context: StaffSettingsContext,
  payload: Partial<StaffProfileSettings>,
) {
  const updates = {
    user_id: context.staffId,
    name: payload.fullName ?? null,
    photo_url: payload.avatarUrl ?? null,
    phone: payload.phoneNumber ?? null,
    timezone: payload.timezone ?? null,
    locale: payload.locale ?? null,
    staff_number: payload.staffNumber ?? null,
    updated_at: new Date().toISOString(),
  };

  const profileResult = await context.supabase.from("user_profiles").upsert(updates, {
    onConflict: "user_id",
  });
  if (profileResult.error) {
    console.error("[settings] profile upsert failed", profileResult.error);
    throw new Error("Unable to save profile");
  }

  const staffResult = await context.supabase
    .from("staff")
    .update({
      full_name: payload.fullName ?? context.displayName,
      avatar_url: payload.avatarUrl ?? null,
    })
    .eq("id", context.staffId);
  if (staffResult.error) {
    console.warn("[settings] staff table update failed", staffResult.error);
  }

  await context.supabase.auth.admin.updateUserById(context.staffId, {
    user_metadata: {
      full_name: payload.fullName ?? context.displayName,
      avatar_url: payload.avatarUrl ?? null,
      timezone: payload.timezone ?? null,
      locale: payload.locale ?? null,
      role: context.settingsRole,
    },
  });
}

export async function saveNotificationSection(
  context: StaffSettingsContext,
  settings: NotificationSettings,
) {
  const rows = NOTIFICATION_TYPE_MAP.map(({ key, notification_type }) => ({
    user_id: context.staffId,
    notification_type,
    enabled: settings[key],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await context.supabase.from("user_notifications").upsert(rows, {
    onConflict: "user_id, notification_type",
  });

  if (error) {
    console.error("[settings] notifications save failed", error);
    throw new Error("Unable to save notification preferences");
  }
}

export async function savePreferencesSection(
  context: StaffSettingsContext,
  preferences: StaffPreferences,
) {
  const { error } = await context.supabase.from("user_preferences").upsert(
    {
      user_id: context.staffId,
      preferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[settings] preferences save failed", error);
    throw new Error("Unable to save preferences");
  }
}

export async function createRoleChangeRequest(
  context: StaffSettingsContext,
  payload: { requestedRole: SettingsRole; reason?: string },
) {
  if (context.settingsRole === payload.requestedRole) {
    throw new Error("You already have that role");
  }

  const existing = await context.supabase
    .from("role_change_requests")
    .select("id")
    .eq("staff_id", context.staffId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing.data?.id) {
    throw new Error("You already have a pending request");
  }

  const { error } = await context.supabase.from("role_change_requests").insert({
    staff_id: context.staffId,
    current_role: context.settingsRole,
    requested_role: payload.requestedRole,
    reason: payload.reason ?? null,
  });

  if (error) {
    console.error("[settings] role request insert failed", error);
    throw new Error("Unable to submit role change request");
  }
}

export async function resolveRoleChangeRequest(
  context: StaffSettingsContext,
  payload: { requestId: string; status: Exclude<RoleChangeStatus, "pending">; note?: string },
) {
  if (!context.isOwner) {
    throw new Error("Only owners can resolve role requests");
  }

  const requestRes = await context.supabase
    .from("role_change_requests")
    .select("staff_id, requested_role, status")
    .eq("id", payload.requestId)
    .maybeSingle();

  if (requestRes.error || !requestRes.data) {
    throw new Error("Role request not found");
  }

  if (requestRes.data.status !== "pending") {
    throw new Error("Request already resolved");
  }

  const updates = {
    status: payload.status,
    resolution_note: payload.note ?? null,
    reviewed_by: context.staffId,
    reviewed_at: new Date().toISOString(),
  };

  const updateRes = await context.supabase
    .from("role_change_requests")
    .update(updates)
    .eq("id", payload.requestId);
  if (updateRes.error) {
    console.error("[settings] role request verdict failed", updateRes.error);
    throw new Error("Unable to resolve role request");
  }

  if (payload.status === "approved") {
    const newRole = requestRes.data.requested_role;
    await context.supabase.from("user_roles").upsert(
      {
        user_id: requestRes.data.staff_id,
        role: newRole,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    await context.supabase
      .from("staff")
      .update({ role: newRole })
      .eq("id", requestRes.data.staff_id);
    await context.supabase.auth.admin.updateUserById(requestRes.data.staff_id, {
      user_metadata: { role: newRole },
    });
  }
}

export async function revokeDeviceSession(context: StaffSettingsContext, sessionId: string) {
  const { error } = await context.supabase.rpc("delete_user_session", { p_session_id: sessionId });
  if (error) {
    console.error("[settings] session revoke failed", error);
    throw new Error("Unable to revoke device session");
  }
}

export async function revokeAllDeviceSessions(context: StaffSettingsContext) {
  const { error } = await context.supabase.rpc("delete_all_sessions_for_user", {
    p_user_id: context.staffId,
  });
  if (error) {
    console.error("[settings] revoke all sessions failed", error);
    throw new Error("Unable to log out devices");
  }
}

async function buildAccessControlState(
  context: StaffSettingsContext,
  myRequestRows: Array<RoleRequestRow>,
  queueRows: Array<RoleRequestRow>,
): Promise<AccessControlState> {
  const myRequest = myRequestRows.find(Boolean);
  let queue: RoleChangeRequest[] = [];

  if (context.isOwner && queueRows.length) {
    const ids = Array.from(
      new Set(queueRows.flatMap((row) => [row.staff_id, row.reviewed_by]).filter(Boolean)),
    );
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const lookup = await context.supabase
        .from("staff")
        .select("id, full_name")
        .in("id", ids);
      if (!lookup.error) {
        nameMap = new Map((lookup.data ?? []).map((entry) => [entry.id, entry.full_name ?? "Crew"]));
      }
    }
    queue = queueRows.map((row) =>
      toRoleChangeRequest(row, nameMap.get(row.staff_id ?? "") ?? "Crew", nameMap),
    );
  }

  return {
    canRequestChange: !context.isOwner,
    canReviewChange: context.isOwner,
    availableRoles: REQUESTABLE_ROLES,
    myRequest: myRequest
      ? toRoleChangeRequest(myRequest, context.displayName, new Map())
      : null,
    queue,
  };
}

function mapProfile(
  context: StaffSettingsContext,
  profileRow?: {
    name?: string | null;
    photo_url?: string | null;
    phone?: string | null;
    timezone?: string | null;
    locale?: string | null;
    staff_number?: string | null;
  } | null,
  staffRow?: { full_name?: string | null; avatar_url?: string | null; email?: string | null } | null,
): StaffProfileSettings {
  return {
    id: context.staffId,
    fullName: profileRow?.name ?? staffRow?.full_name ?? context.displayName,
    email: staffRow?.email ?? context.email,
    phoneNumber: profileRow?.phone ?? undefined,
    avatarUrl: profileRow?.photo_url ?? staffRow?.avatar_url ?? undefined,
    role: context.settingsRole,
    timezone: profileRow?.timezone ?? DEFAULT_PREFERENCES.timezone,
    locale: profileRow?.locale ?? "en-US",
    staffNumber: profileRow?.staff_number ?? undefined,
  };
}

function mapPreferences(source?: Record<string, unknown> | null): StaffPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(source as StaffPreferences | undefined),
  };
}

function mapNotifications(rows: Array<{ notification_type?: string | null; enabled?: boolean | null }>) {
  const merged: NotificationSettings = { ...DEFAULT_NOTIFICATIONS };
  rows.forEach((row) => {
    const mapping = NOTIFICATION_TYPE_MAP.find(
      (entry) => entry.notification_type === row.notification_type,
    );
    if (mapping) {
      merged[mapping.key] = Boolean(row.enabled);
    }
  });
  return merged;
}

function mapDeviceSessions(rows: Array<DeviceSessionRow>): DeviceSession[] {
  return rows.map((row) => {
    const summary = summarizeUserAgent(row.user_agent);
    return {
      id: row.session_id,
      deviceName: summary.deviceName,
      platform: summary.platform,
      location: row.ip_address || "Unknown",
      lastSeenAt: row.last_active ?? row.created_at ?? new Date().toISOString(),
      trusted: true,
    };
  });
}

function summarizeUserAgent(agent?: string | null): { deviceName: string; platform: string } {
  if (!agent) {
    return { deviceName: "Unknown Device", platform: "Unknown" };
  }
  const normalized = agent.toLowerCase();
  if (normalized.includes("iphone")) {
    return { deviceName: "iPhone", platform: "iOS" };
  }
  if (normalized.includes("ipad")) {
    return { deviceName: "iPad", platform: "iPadOS" };
  }
  if (normalized.includes("android")) {
    return { deviceName: "Android Device", platform: "Android" };
  }
  if (normalized.includes("mac os")) {
    return { deviceName: "Mac", platform: "macOS" };
  }
  if (normalized.includes("windows")) {
    return { deviceName: "Windows Device", platform: "Windows" };
  }
  return { deviceName: agent.slice(0, 48), platform: "Browser" };
}

type RoleRequestRow = {
  id: string;
  staff_id: string;
  current_role: string;
  requested_role: string;
  status: RoleChangeStatus;
  reason?: string | null;
  resolution_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
};

function toRoleChangeRequest(
  row: RoleRequestRow,
  staffName: string,
  nameMap: Map<string, string>,
): RoleChangeRequest {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName,
    currentRole: normalizeSettingsRole(row.current_role),
    requestedRole: normalizeSettingsRole(row.requested_role),
    status: row.status,
    reason: row.reason ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    reviewerName: row.reviewed_by ? nameMap.get(row.reviewed_by) ?? "Owner" : undefined,
    resolutionNote: row.resolution_note ?? undefined,
  };
}

type DeviceSessionRow = {
  session_id: string;
  user_agent?: string | null;
  ip_address?: string | null;
  created_at?: string | null;
  last_active?: string | null;
};

