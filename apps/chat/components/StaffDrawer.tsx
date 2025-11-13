"use client";

import { PresenceDot } from "@/apps/chat/components/PresenceDot";
import { usePresence } from "@/apps/chat/hooks/usePresence";

type StaffDrawerProps = {
  currentUserId?: string | null;
  onSelect: (staff: { id: string; full_name?: string | null }) => void;
};

export function StaffDrawer({ currentUserId, onSelect }: StaffDrawerProps) {
  const { staff, loading } = usePresence();
  const available = staff.filter((member) => member.id !== currentUserId);

  return (
    <details className="relative rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/30">
      <summary className="flex cursor-pointer select-none items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/60 outline-none">
        Crew
      </summary>
      <div className="absolute right-0 top-full z-20 mt-3 w-72 rounded-2xl border border-white/10 bg-[#090912]/95 p-3 shadow-[0_25px_80px_rgba(0,0,0,0.75)] backdrop-blur">
        {loading ? (
          <p className="px-2 py-3 text-center text-xs text-white/50">
            Loading roster…
          </p>
        ) : available.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-white/50">
            No teammates available.
          </p>
        ) : (
          <ul className="space-y-1">
            {available.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: member.id, full_name: member.full_name })}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-white/80 transition hover:bg-white/10"
                >
                  <PresenceDot state={member.state ?? undefined} />
                  <span className="flex-1 truncate">{member.full_name ?? "Unknown"}</span>
                  {member.role && (
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      {member.role}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export default StaffDrawer;
