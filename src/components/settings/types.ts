"use client";

export type SettingsRole = "boh" | "foh" | "manager" | "owner";

export type SettingsSectionId = "profile" | "access" | "notifications" | "preferences" | "devices";

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  roles: SettingsRole[];
};

export type RoleChangeStatus = "pending" | "approved" | "denied";

export type LandingPageOption = "schedule" | "menu" | "events" | "inventory" | "reflection" | "settings";

export type DensityOption = "compact" | "comfortable";

export type SettingsSaveState = "idle" | "saving" | "saved" | "error";

export interface StaffProfileSettings {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: SettingsRole;
  timezone?: string;
  locale?: string;
  staffNumber?: string;
}

export interface NotificationSettings {
  scheduleChanges: boolean;
  newReflections: boolean;
  eventReminders: boolean;
  inventoryAlerts: boolean;
  deviceAlerts: boolean;
  channelEmail: boolean;
  channelSms: boolean;
  channelInApp: boolean;
}

export interface StaffPreferences {
  defaultLandingPage: LandingPageOption;
  density: DensityOption;
  enableHaptics: boolean;
  autoAcknowledgeShifts: boolean;
  ambientSound: boolean;
  timezone?: string;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  location: string;
  platform: string;
  lastSeenAt: string;
  trusted: boolean;
}

export interface RoleChangeRequest {
  id: string;
  staffId: string;
  staffName: string;
  currentRole: SettingsRole;
  requestedRole: SettingsRole;
  status: RoleChangeStatus;
  reason?: string;
  createdAt: string;
  reviewerName?: string;
  resolutionNote?: string;
}

export interface AccessControlState {
  canRequestChange: boolean;
  canReviewChange: boolean;
  availableRoles: SettingsRole[];
  myRequest: RoleChangeRequest | null;
  queue: RoleChangeRequest[];
}

export interface StaffSettingsResponse {
  profile: StaffProfileSettings;
  notifications: NotificationSettings;
  preferences: StaffPreferences;
  deviceSessions: DeviceSession[];
  role: SettingsRole;
  accessControl: AccessControlState;
}
