"use client";

import type { PresenceUser } from "@/apps/chat/types";

type PresenceBarProps = {
  users: PresenceUser[];
};

export function PresenceBar({ users }: PresenceBarProps) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/50">
        No teammates online.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
      {users.map((user) => (
        <div
          key={user.user_id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs uppercase text-white/80">
            {user.name?.[0] ?? "?"}
          </div>
          <div className="text-sm leading-tight">
            <p className="font-medium">{user.name ?? "Unknown"}</p>
            <p className="text-xs text-white/60">{user.role ?? "team"}</p>
          </div>
          <span
            className={`ml-auto h-2 w-2 rounded-full ${
              user.state === "online" ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
