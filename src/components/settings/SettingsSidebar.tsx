"use client";

import type { SettingsNavItem, SettingsRole, SettingsSectionId } from "./types";

type Props = {
  items: SettingsNavItem[];
  active: SettingsSectionId;
  setActive: (id: SettingsSectionId) => void;
  role: SettingsRole;
};

export function SettingsSidebar({ items, active, setActive, role }: Props) {
  return (
    <aside className="w-full max-w-[240px] text-white">
      <div className="space-y-2">
        <p className="text-[0.6rem] uppercase tracking-[0.45em] text-white/40 whitespace-nowrap">
          SettingsOS · {role.toUpperCase()}
        </p>
        <nav className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between px-4 py-3 text-left text-sm font-medium tracking-tight text-white/70 transition ${
                  isActive ? "bg-white/10 text-white" : "hover:bg-white/5"
                }`}
              >
                <span className="truncate whitespace-nowrap">{item.label}</span>
                <span className="text-[0.6rem] uppercase tracking-[0.4em] text-white/30">
                  {isActive ? "●" : ""}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
