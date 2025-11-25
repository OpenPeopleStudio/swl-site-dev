"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { ROLE_LABELS, SETTINGS_NAV } from "./constants";
import type {
  AccessControlState,
  DeviceSession,
  NotificationSettings,
  SettingsRole,
  SettingsSectionId,
  SettingsSaveState,
  StaffPreferences,
  StaffProfileSettings,
  StaffSettingsResponse,
} from "./types";
import { ProfileSection } from "./sections/ProfileSection";
import { AccessSection } from "./sections/AccessSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PreferencesSection } from "./sections/PreferencesSection";
import { DevicesSection } from "./sections/DevicesSection";

type SectionStatusMap = Record<SettingsSectionId, { state: SettingsSaveState; message?: string }>;
type HydrationState = "loading" | "ready" | "error";

const SECTION_IDS: SettingsSectionId[] = ["profile", "access", "notifications", "preferences", "devices"];

const INITIAL_STATUS: SectionStatusMap = SECTION_IDS.reduce((acc, id) => {
  acc[id] = { state: "idle" };
  return acc;
}, {} as SectionStatusMap);

/**
 * Layout map:
 * - Navigation rail (left/top) renders breadcrumb-like text links for Profile → Access → Notifications → Preferences → Devices.
 * - Section pane (right) shows a single section at a time inside a thin translucent panel so the star-field remains visible.
 * - Actions stay inside each section (save, log out everywhere) to clarify where Supabase mutations will land.
 */
export function SettingsWorkspace({ role: roleHint }: { role?: SettingsRole }) {
  const [role, setRole] = useState<SettingsRole>(roleHint ?? "boh");
  const navItems = useMemo(
    () => SETTINGS_NAV.filter((item) => item.roles.includes(role)),
    [role],
  );
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const currentSection = useMemo<SettingsSectionId>(() => {
    return navItems.find((item) => item.id === activeSection)?.id ?? navItems[0]?.id ?? "profile";
  }, [navItems, activeSection]);

  const [hydrationState, setHydrationState] = useState<HydrationState>("loading");
  const [sectionStatus, setSectionStatus] = useState<SectionStatusMap>(INITIAL_STATUS);
  const [profile, setProfile] = useState<StaffProfileSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [preferences, setPreferences] = useState<StaffPreferences | null>(null);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [accessControl, setAccessControl] = useState<AccessControlState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPayload = useCallback((payload: StaffSettingsResponse) => {
    setProfile(payload.profile);
    setNotifications(payload.notifications);
    setPreferences(payload.preferences);
    setDeviceSessions(payload.deviceSessions);
    setAccessControl(payload.accessControl);
    setRole(payload.role);
  }, []);

  const fetchSettings = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setHydrationState("loading");
        setErrorMessage(null);
      }
      try {
        const response = await fetch("/api/staff/settings", { cache: "no-store" });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error ?? "Failed to load settings");
        }
        const payload = (await response.json()) as StaffSettingsResponse;
        applyPayload(payload);
        setHydrationState("ready");
      } catch (error) {
        console.error("[settings] fetch failed", error);
        setErrorMessage((error as Error).message ?? "Unable to load settings");
        setHydrationState("error");
      }
    },
    [applyPayload],
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function updateSectionState(section: SettingsSectionId, state: SettingsSaveState, message?: string) {
    setSectionStatus((prev) => ({
      ...prev,
      [section]: { state, message },
    }));
  }

  async function persistSection(section: "profile" | "notifications" | "preferences", payload: unknown) {
    updateSectionState(section, "saving", "Saving…");
    try {
      const response = await fetch("/api/staff/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, payload }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error ?? "Save failed");
      }

      const data = (await response.json()) as StaffSettingsResponse;
      applyPayload(data);
      updateSectionState(section, "saved", "Saved · just now");
      setTimeout(() => updateSectionState(section, "idle"), 2200);
    } catch (error) {
      updateSectionState(section, "error", (error as Error).message ?? "Save failed");
    }
  }

  async function handleRoleRequest(payload: { requestedRole: SettingsRole; reason?: string }) {
    updateSectionState("access", "saving", "Submitting request…");
    try {
      const response = await fetch("/api/staff/settings/role-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error ?? "Unable to submit");
      }
      const data = (await response.json()) as StaffSettingsResponse;
      applyPayload(data);
      updateSectionState("access", "saved", "Request sent");
      setTimeout(() => updateSectionState("access", "idle"), 2200);
    } catch (error) {
      updateSectionState("access", "error", (error as Error).message ?? "Unable to submit");
    }
  }

  async function handleRoleVerdict(payload: { requestId: string; status: "approved" | "denied"; note?: string }) {
    updateSectionState("access", "saving", "Updating request…");
    try {
      const response = await fetch(`/api/staff/settings/role-requests/${payload.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: payload.status, note: payload.note }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error ?? "Unable to resolve request");
      }
      const data = (await response.json()) as StaffSettingsResponse;
      applyPayload(data);
      updateSectionState("access", "saved", "Updated");
      setTimeout(() => updateSectionState("access", "idle"), 2200);
    } catch (error) {
      updateSectionState("access", "error", (error as Error).message ?? "Unable to resolve");
    }
  }

  async function handleDeviceAction(action: "single" | "all", sessionId?: string) {
    updateSectionState("devices", "saving", action === "single" ? "Revoking…" : "Logging out…");
    try {
      const endpoint =
        action === "single" && sessionId
          ? `/api/staff/settings/devices/${sessionId}`
          : "/api/staff/settings/devices/logout-all";
      const method = action === "single" ? "DELETE" : "POST";
      const response = await fetch(endpoint, { method });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error ?? "Unable to update devices");
      }
      const data = (await response.json()) as StaffSettingsResponse;
      applyPayload(data);
      updateSectionState(
        "devices",
        "saved",
        action === "single" ? "Device revoked" : "All devices logged out",
      );
      setTimeout(() => updateSectionState("devices", "idle"), 2200);
    } catch (error) {
      updateSectionState("devices", "error", (error as Error).message ?? "Unable to update devices");
    }
  }

  function renderSection(): ReactNode {
    if (hydrationState === "loading") {
      return <SettingsLoadingState />;
    }

    if (hydrationState === "error") {
      return (
        <ErrorState
          message={errorMessage ?? "Unable to load settings"}
          onRetry={() => fetchSettings()}
        />
      );
    }

    if (!profile || !notifications || !preferences || !accessControl) {
      return <SettingsLoadingState />;
    }

    switch (currentSection) {
      case "profile":
        return (
          <ProfileSection
            profile={profile}
            onChange={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
            onSave={() => persistSection("profile", profile)}
            saving={sectionStatus.profile.state === "saving"}
            statusMessage={sectionStatus.profile.message}
          />
        );
      case "access":
        return (
          <AccessSection
            profile={profile}
            roleLabel={ROLE_LABELS[role]}
            accessControl={accessControl}
            saving={sectionStatus.access.state === "saving"}
            statusMessage={sectionStatus.access.message}
            onSubmitRequest={handleRoleRequest}
            onResolveRequest={handleRoleVerdict}
          />
        );
      case "notifications":
        return (
          <NotificationsSection
            settings={notifications}
            onToggle={(key, value) => setNotifications((prev) => (prev ? { ...prev, [key]: value } : prev))}
            onSave={() => persistSection("notifications", notifications)}
            saving={sectionStatus.notifications.state === "saving"}
            statusMessage={sectionStatus.notifications.message}
          />
        );
      case "preferences":
        return (
          <PreferencesSection
            preferences={preferences}
            onChange={(patch) => setPreferences((prev) => (prev ? { ...prev, ...patch } : prev))}
            onSave={() => persistSection("preferences", preferences)}
            saving={sectionStatus.preferences.state === "saving"}
            statusMessage={sectionStatus.preferences.message}
          />
        );
      case "devices":
        return (
          <DevicesSection
            sessions={deviceSessions}
            onInvalidateSession={(id) => handleDeviceAction("single", id)}
            onLogOutAll={() => handleDeviceAction("all")}
            saving={sectionStatus.devices.state === "saving"}
            statusMessage={sectionStatus.devices.message}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span className="whitespace-nowrap rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.4em]">
            {ROLE_LABELS[role]}
          </span>
          <p className="text-xs sm:text-sm">
            SettingsOS auto-loads slices for {ROLE_LABELS[role]}. Owners unlock additional panes as they land.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsSidebar
          role={role}
          items={navItems}
          active={currentSection}
          setActive={setActiveSection}
        />
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

function SettingsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-56 animate-pulse rounded-full bg-white/10" />
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 animate-pulse rounded-full bg-white/5" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:border-white/70"
      >
        Retry
      </button>
    </div>
  );
}
