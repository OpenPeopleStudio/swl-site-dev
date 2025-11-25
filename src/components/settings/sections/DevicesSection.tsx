import { SettingsSection } from "../SettingsSection";
import type { DeviceSession } from "../types";

type Props = {
  sessions: DeviceSession[];
  onInvalidateSession: (id: string) => Promise<void> | void;
  onLogOutAll: () => Promise<void> | void;
  saving: boolean;
  statusMessage?: string;
};

export function DevicesSection({ sessions, onInvalidateSession, onLogOutAll, saving, statusMessage }: Props) {
  const hasSessions = sessions.length > 0;

  return (
    <SettingsSection
      kicker="Devices"
      title="Devices & sessions"
      description="Track everywhere you're signed in. Logging out removes device tokens and invalidates refresh keys."
      actions={
        hasSessions && (
          <button
            type="button"
            onClick={() => onLogOutAll()}
            disabled={saving}
            className="rounded-full border border-rose-400/60 px-4 py-2 text-xs uppercase tracking-[0.35em] text-rose-200 transition hover:border-rose-300 disabled:opacity-50"
          >
            Log out everywhere
          </button>
        )
      }
    >
      <div className="space-y-4">
        {hasSessions ? (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white whitespace-nowrap truncate">{session.deviceName}</p>
                  <p className="text-xs text-white/60">
                    {session.platform} · {session.location}
                  </p>
                  <p className="text-xs text-white/40">Last seen {session.lastSeenAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[0.65rem] uppercase tracking-[0.35em] ${
                      session.trusted ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {session.trusted ? "Trusted" : "Review"}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onInvalidateSession(session.id)}
                    className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/60 hover:border-white/60 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">No active sessions detected.</p>
        )}
        <div className="text-xs text-white/50">{statusMessage ?? "Supabase auth sessions listed above."}</div>
      </div>
    </SettingsSection>
  );
}

