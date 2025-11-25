import type { SettingsNavItem, SettingsRole } from "./types";

export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: "profile", label: "Profile", roles: ["boh", "foh", "manager", "owner"] },
  { id: "access", label: "Access", roles: ["boh", "foh", "manager", "owner"] },
  { id: "notifications", label: "Notifications", roles: ["boh", "foh", "manager", "owner"] },
  { id: "preferences", label: "Preferences", roles: ["boh", "foh", "manager", "owner"] },
  { id: "devices", label: "Devices", roles: ["boh", "foh", "manager", "owner"] },
];

export const ROLE_LABELS: Record<SettingsRole, string> = {
  boh: "Back of House",
  foh: "Front of House",
  manager: "Manager",
  owner: "Owner",
};

export const ROLE_PERMISSION_SUMMARIES: Record<
  SettingsRole,
  { headline: string; capabilities: string[]; escalation: string }
> = {
  boh: {
    headline: "Prep, production, and mise alerts",
    capabilities: [
      "Edit mise and prep notes",
      "Acknowledge cooking timers",
      "Escalate ingredient shortages",
    ],
    escalation: "Role edits locked to Leads or Owners",
  },
  foh: {
    headline: "Floor pacing, guest notes, pacing alerts",
    capabilities: [
      "Adjust pacing and holding patterns",
      "Flag VIP or allergy guests",
      "Push tempo updates to BOH stations",
    ],
    escalation: "Role edits locked to Leads or Owners",
  },
  manager: {
    headline: "Cross-room orchestration and staffing",
    capabilities: [
      "Override pacing + hold states",
      "Set staffing modes + warnings",
      "Approve overtime or swap requests",
    ],
    escalation: "Role edits locked to Owners",
  },
  owner: {
    headline: "Whole-system orchestration + finance view",
    capabilities: [
      "Grant or revoke any role",
      "Unlock advanced admin panes",
      "Schedule downtime + maintenance",
    ],
    escalation: "Owner is the top rung",
  },
};
