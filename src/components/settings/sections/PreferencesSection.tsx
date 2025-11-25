import { SettingsField, SettingsSection } from "../SettingsSection";
import type { DensityOption, StaffPreferences } from "../types";

type Props = {
  preferences: StaffPreferences;
  onChange: (patch: Partial<StaffPreferences>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  statusMessage?: string;
};

const landingOptions = [
  { value: "schedule", label: "Schedule" },
  { value: "menu", label: "Menu" },
  { value: "events", label: "Events" },
  { value: "inventory", label: "Inventory" },
  { value: "reflection", label: "Reflection" },
  { value: "settings", label: "Settings" },
] as const;

const densityOptions: Array<{ value: DensityOption; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

export function PreferencesSection({ preferences, onChange, onSave, saving, statusMessage }: Props) {
  async function handleSave() {
    await onSave();
  }

  return (
    <SettingsSection
      kicker="Preferences"
      title="Behavior & UI"
      description="Personal behaviors stay scoped to each staff account while respecting role restrictions."
    >
      <div className="space-y-6">
        <SettingsField label="Default landing page" helper="Where StaffOS opens after login.">
          <select
            value={preferences.defaultLandingPage}
            onChange={(event) =>
              onChange({ defaultLandingPage: event.target.value as StaffPreferences["defaultLandingPage"] })
            }
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
          >
            {landingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsField>

        <SettingsField label="UI density">
          <div className="flex flex-wrap gap-2">
            {densityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ density: option.value })}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35em] ${
                  preferences.density === option.value
                    ? "border-white/60 text-white"
                    : "border-white/15 text-white/50 hover:border-white/40"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SettingsField>

        <div className="grid gap-3 md:grid-cols-3">
          <PreferenceToggle
            label="Enable haptics"
            helper="Tap feedback on iOS + Android"
            value={preferences.enableHaptics}
            onChange={(value) => onChange({ enableHaptics: value })}
          />
          <PreferenceToggle
            label="Auto-ack shifts"
            helper="Auto acknowledge shift reminders"
            value={preferences.autoAcknowledgeShifts}
            onChange={(value) => onChange({ autoAcknowledgeShifts: value })}
          />
          <PreferenceToggle
            label="Ambient sound"
            helper="Low-volume lobby loop"
            value={preferences.ambientSound}
            onChange={(value) => onChange({ ambientSound: value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40 whitespace-nowrap">
            Writes sync to Supabase · staff_preferences
          </p>
          <div className="flex items-center gap-3">
            {statusMessage && <span className="text-xs text-white/60">{statusMessage}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 transition hover:border-cyan-300 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

function PreferenceToggle({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left ${
        value ? "border-white/60 bg-white/[0.06]" : "border-white/15 hover:border-white/40"
      }`}
    >
      <span className="text-sm font-medium text-white whitespace-nowrap truncate">{label}</span>
      <span className="text-xs text-white/50">{helper}</span>
      <span className={`text-[0.65rem] uppercase tracking-[0.3em] ${value ? "text-cyan-300" : "text-white/30"}`}>
        {value ? "Enabled" : "Disabled"}
      </span>
    </button>
  );
}

