import type {
  SettingsNavItem,
  SettingsRole,
  PreferencesState,
  NotificationOption,
} from "./types";

export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: "profile", label: "Profile", roles: ["boh", "foh", "manager", "owner"] },
  { id: "preferences", label: "Preferences", roles: ["boh", "foh", "manager", "owner"] },
  { id: "notifications", label: "Notifications", roles: ["boh", "foh", "manager", "owner"] },
  { id: "integrations", label: "Integrations", roles: ["manager", "owner"] },
  { id: "security", label: "Security", roles: ["boh", "foh", "manager", "owner"] },
  { id: "system", label: "System", roles: ["owner"] },
];

export const ROLE_PREFERENCE_SLICES: Record<SettingsRole, SettingsRole[]> = {
  boh: ["boh"],
  foh: ["foh"],
  manager: ["boh", "foh", "manager"],
  owner: ["boh", "foh", "manager", "owner"],
};

export const DEFAULT_PREFERENCES: PreferencesState = {
  boh: {
    defaultStation: "garde",
    defaultPrepView: "list",
    measurementUnits: "metric",
    timerBehavior: "auto",
  },
  foh: {
    tableMapTheme: "dark",
    pacingAlertStyle: "soft",
    serviceChime: true,
    allergyVisibility: "expanded",
  },
  manager: {
    autoSurfaceWarnings: true,
    staffingAlerts: "balanced",
    minimalNoiseMode: false,
    escalationChannel: "push",
  },
  owner: {
    uiDepthMode: "expanded",
    financialAlertThreshold: "medium",
    reflectionCadence: "weekly",
    timeHorizon: "month",
  },
};

export const COMMON_NOTIFICATION_OPTIONS: NotificationOption[] = [
  { id: "mentions", label: "@mention notifications", roles: "all" },
  { id: "shift_changes", label: "Shift changes", roles: "all" },
  { id: "emergency_alerts", label: "Emergency alerts", helper: "Always-on for Ops", roles: "all" },
];

export const ROLE_NOTIFICATION_OPTIONS: Record<SettingsRole, NotificationOption[]> = {
  boh: [
    { id: "prep_changes", label: "Prep changes", roles: ["boh"] },
    { id: "allergen_updates", label: "Allergen updates", roles: ["boh"] },
    { id: "ingredient_subs", label: "Ingredient substitutions", roles: ["boh"] },
  ],
  foh: [
    { id: "pacing_alerts", label: "Pacing alerts", roles: ["foh"] },
    { id: "wine_pairing", label: "Wine pairing levels", roles: ["foh"] },
    { id: "vip_flags", label: "VIP flags", roles: ["foh"] },
  ],
  manager: [
    { id: "service_delays", label: "Service delays", roles: ["manager"] },
    { id: "staff_callouts", label: "Staff callouts", roles: ["manager"] },
    { id: "equipment_issues", label: "Equipment issues", roles: ["manager"] },
  ],
  owner: [
    { id: "financial_discrepancies", label: "Financial discrepancies", roles: ["owner"] },
    { id: "vendor_cost_spikes", label: "Vendor cost spikes", roles: ["owner"] },
    { id: "alignment_drops", label: "Alignment drops", roles: ["owner"] },
    { id: "high_risk_nights", label: "High-risk operational nights", roles: ["owner"] },
  ],
};

export const SCALE_STATIONS = ["garde", "hot line", "pastry", "expo", "bar"];

export const CONNECTION_TYPES = [
  { value: "ble", label: "Bluetooth LE" },
  { value: "usb", label: "USB" },
  { value: "wifi", label: "Wi-Fi" },
];
