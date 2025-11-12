"use client";

import { useEffect, useMemo, useState } from "react";

type PresencePayload = Record<
  string,
  Array<{
    user_id: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
    state?: string;
    last_active?: string;
  }>
>;

const stateColorMap: Record<string, string> = {
  "on-shift": "bg-green-400",
  online: "bg-sky-400",
  away: "bg-neutral-500",
};

function formatTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PresenceSidebar() {
  const [presence, setPresence] = useState<PresencePayload>({});

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<PresencePayload>).detail ?? {};
      setPresence(detail);
    }

    window.addEventListener("presenceUpdate", handler as EventListener);
    return () =>
      window.removeEventListener("presenceUpdate", handler as EventListener);
  }, []);

  const entries = useMemo(() => {
    return Object.entries(presence)
      .map(([key, sessions]) => {
        const latest = sessions[sessions.length - 1];
        if (!latest) return null;
        return { id: key, ...latest };
      })
      .filter(Boolean) as Array<{
      id: string;
      user_id: string;
      full_name?: string;
      avatar_url?: string;
      role?: string;
      state?: string;
      last_active?: string;
    }>;
  }, [presence]);

  if (!entries.length) {
    return (
    <aside className="glass-morphic hidden w-48 flex-col border-l border-white/5 p-4 text-xs text-white/50 md:flex">
        <p className="text-white/40">No staff online</p>
      </aside>
    );
  }

  return (
    <aside className="glass-morphic hidden w-52 flex-col border-l border-white/10 p-4 text-xs text-white/80 md:flex">
      <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
        Presence
      </p>
      <div className="space-y-3">
        {entries.map((entry) => {
          const color =
            stateColorMap[entry.state ?? "online"] ?? "bg-sky-400";
          const avatar =
            entry.avatar_url ??
            `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.full_name ?? entry.user_id)}&background=0F172A&color=fff&size=64`;
          return (
            <div
              key={entry.id}
              className="glass-morphic flex items-center gap-3 rounded-2xl border border-white/5 px-2 py-2 transition-all hover:scale-[1.01]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt={entry.full_name ?? entry.user_id}
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <div className="flex flex-1 flex-col leading-tight">
                <span className="text-sm text-white">
                  {entry.full_name ?? entry.user_id}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                  {entry.role ?? "Staff"}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${color}`}
                  />
                  <span>{entry.state ?? "online"}</span>
                  <span>{formatTime(entry.last_active)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
