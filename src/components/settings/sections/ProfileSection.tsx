"use client";

import Image from "next/image";
import { SettingsField, SettingsSection } from "../SettingsSection";
import type { StaffProfileSettings } from "../types";

type Props = {
  profile: StaffProfileSettings;
  disabled?: boolean;
  onChange: (patch: Partial<StaffProfileSettings>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  statusMessage?: string;
};

export function ProfileSection({ profile, disabled, onChange, onSave, saving, statusMessage }: Props) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    await onSave();
  }

  return (
    <SettingsSection
      kicker="Profile"
      title="Identity"
      description="Display name, contact info, and avatar appear everywhere across StaffOS."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SettingsField label="Display name">
            <input
              type="text"
              value={profile.fullName}
              disabled={disabled}
              onChange={(event) => onChange({ fullName: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
            />
          </SettingsField>

          <SettingsField label="Email">
            <input
              type="email"
              value={profile.email}
              disabled={disabled}
              onChange={(event) => onChange({ email: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
            />
          </SettingsField>

          <SettingsField label="Phone">
            <input
              type="tel"
              value={profile.phoneNumber ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ phoneNumber: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
            />
          </SettingsField>

          <SettingsField label="Timezone">
            <select
              value={profile.timezone ?? "America/Chicago"}
              disabled={disabled}
              onChange={(event) => onChange({ timezone: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </SettingsField>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SettingsField label="Avatar URL" helper="Shown in badges, schedules, and reflections.">
            <input
              type="url"
              value={profile.avatarUrl ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ avatarUrl: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
            />
          </SettingsField>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/30">—</div>
              )}
            </div>
            <p className="text-xs text-white/60">Drop a hosted image URL. We cache thumbnails per staff ID.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField label="Role">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm uppercase tracking-[0.35em] text-white/70">
              {profile.role}
            </div>
          </SettingsField>
          <SettingsField label="Staff number">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
              {profile.staffNumber ?? "pending"}
            </div>
          </SettingsField>
          <SettingsField label="Locale">
            <select
              value={profile.locale ?? "en-US"}
              disabled={disabled}
              onChange={(event) => onChange({ locale: event.target.value })}
              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="en-US">English (US)</option>
              <option value="es-MX">Español (MX)</option>
              <option value="fr-CA">Français (CA)</option>
            </select>
          </SettingsField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40 whitespace-nowrap">
            Writes sync to Supabase · staff_profile
          </p>
          <div className="flex items-center gap-3">
            {statusMessage && <span className="text-xs text-white/60">{statusMessage}</span>}
            <button
              type="submit"
              disabled={disabled || saving}
              className="rounded-full border border-cyan-400/50 px-5 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 transition hover:border-cyan-300 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </SettingsSection>
  );
}
