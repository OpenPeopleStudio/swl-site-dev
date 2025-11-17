"use client";

import { motion } from "framer-motion";
import type { SettingsNavItem, SettingsRole, SettingsSectionId } from "./types";

type Props = {
  items: SettingsNavItem[];
  active: SettingsSectionId;
  setActive: (id: SettingsSectionId) => void;
  role: SettingsRole;
};

export function SettingsSidebar({ items, active, setActive, role }: Props) {
  return (
    <aside className="w-full max-w-xs rounded-[32px] border border-white/10 bg-black/30 p-4 backdrop-blur-2xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.35em] text-white/50">
        SettingsOS · {role.toUpperCase()}
        <p className="mt-1 text-[0.6rem] tracking-[0.4em] text-white/30">Role aware · live</p>
      </div>
      <nav className="mt-4 flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={`relative flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm uppercase tracking-[0.25em] ${
                isActive
                  ? "border-white/70 bg-white/10 text-white"
                  : "border-white/10 bg-transparent text-white/50 hover:border-white/30 hover:text-white"
              }`}
            >
              <span>{item.label}</span>
              {isActive && (
                <motion.span
                  layoutId="settings-nav-active"
                  className="absolute inset-1 rounded-2xl border border-cyan-400/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
