"use client";

export type SettingsRole = "boh" | "foh" | "manager" | "owner";

export type SettingsSectionId =
  | "profile"
  | "preferences"
  | "notifications"
  | "integrations"
  | "security"
  | "system";

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  roles: SettingsRole[];
};

export type ProfileState = {
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  role: SettingsRole;
  staffId: string;
};

export type BohPreferences = {
  defaultStation: "garde" | "hot_line" | "pastry" | "expo";
  defaultPrepView: "list" | "tile";
  measurementUnits: "metric" | "imperial";
  timerBehavior: "auto" | "manual";
};

export type FohPreferences = {
  tableMapTheme: "dark" | "luminous" | "blueprint";
  pacingAlertStyle: "soft" | "firm" | "off";
  serviceChime: boolean;
  allergyVisibility: "summary" | "expanded";
};

export type ManagerPreferences = {
  autoSurfaceWarnings: boolean;
  staffingAlerts: "minimal" | "balanced" | "aggressive";
  minimalNoiseMode: boolean;
  escalationChannel: "email" | "sms" | "push";
};

export type OwnerPreferences = {
  uiDepthMode: "minimal" | "expanded" | "full-system";
  financialAlertThreshold: "low" | "medium" | "high";
  reflectionCadence: "daily" | "weekly" | "none";
  timeHorizon: "day" | "week" | "month" | "quarter";
};

export type PreferencesState = {
  boh: BohPreferences;
  foh: FohPreferences;
  manager: ManagerPreferences;
  owner: OwnerPreferences;
};

export type NotificationOption = {
  id: string;
  label: string;
  helper?: string;
  roles: SettingsRole[] | "all";
};

export type NotificationMap = Record<string, boolean>;

export type DeviceConnection = {
  id: string;
  user_id: string | null;
  device_type: string;
  device_name: string;
  status: string;
  trust_level: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

export type ScaleProfile = {
  id: string;
  name: string;
  connection_type: "usb" | "ble" | "wifi";
  station: string | null;
  auto_sync: boolean | null;
  last_calibrated: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type SecuritySession = {
  id: string;
  device?: string;
  location?: string;
  last_seen_at?: string;
  trusted?: boolean;
};

export type SecurityState = {
  mfa_enabled: boolean;
  last_reset_at: string | null;
  active_sessions: SecuritySession[];
};
