"use client";

import Image from "next/image";
import type { ProfileState } from "../types";

type Props = {
  profile: ProfileState;
  disabled?: boolean;
  onChange: (patch: Partial<ProfileState>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  statusMessage: string | null;
};

export function ProfileSection({
  profile,
  disabled,
  onChange,
  onSave,
  saving,
  statusMessage,
}: Props) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    await onSave();
  }

  return (
    <section className="glass-panel text-white">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Profile</p>
          <h2 className="text-3xl font-light">Identity & Contact</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.4em] text-white/50">
          <span className="rounded-full border border-white/15 px-3 py-1">
            Role · {profile.role.toUpperCase()}
          </span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Staff ID · {profile.staffId.slice(0, 8)}
          </span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="flex flex-col gap-2 text-sm uppercase tracking-[0.3em] text-white/60">
            Name
            <input
              type="text"
              value={profile.name}
              disabled={disabled}
              onChange={(event) => onChange({ name: event.target.value })}
              className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white focus:border-cyan-400/60 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm uppercase tracking-[0.3em] text-white/60">
            Email
            <input
              type="email"
              value={profile.email}
              disabled={disabled}
              onChange={(event) => onChange({ email: event.target.value })}
              className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white focus:border-cyan-400/60 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm uppercase tracking-[0.3em] text-white/60">
            Phone
            <input
              type="tel"
              value={profile.phone}
              disabled={disabled}
              onChange={(event) => onChange({ phone: event.target.value })}
              className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white focus:border-cyan-400/60 focus:outline-none"
            />
          </label>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-2 text-sm uppercase tracking-[0.3em] text-white/60">
            Profile photo URL
            <input
              type="url"
              value={profile.photoUrl}
              disabled={disabled}
              onChange={(event) => onChange({ photoUrl: event.target.value })}
              className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white focus:border-cyan-400/60 focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {profile.photoUrl ? (
                <Image
                  src={profile.photoUrl}
                  alt={profile.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/30">
                  —
                </div>
              )}
            </div>
            <p className="text-sm text-white/70">
              Drop a hosted image URL to refresh your cortex badge. We cache thumbnails for staff
              quick lookups.
            </p>
          </div>
          <div className="grid gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
            <span>Role access</span>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base tracking-[0.2em]">
              {profile.role}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Writes sync to Supabase · user_profiles
          </p>
          <div className="flex items-center gap-3">
            {statusMessage && (
              <span className="text-xs uppercase tracking-[0.35em] text-emerald-300">{statusMessage}</span>
            )}
            <button
              type="submit"
              disabled={disabled || saving}
              className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-6 py-2 text-xs uppercase tracking-[0.4em] text-cyan-200 hover:border-cyan-300/80 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
