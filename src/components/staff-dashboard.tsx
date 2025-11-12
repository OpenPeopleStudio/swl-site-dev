"use client";

import Link from "next/link";
import { GlassPanel } from "@/components/glass-panel";

const modules = [
  {
    title: "Schedule",
    description: "Access weekly schedules, shift rotations, and live route drift.",
    href: "/staff/schedule",
  },
  {
    title: "Menu Builder",
    description: "Plan, price, and deploy new menu experiences in Cortex.",
    href: "/staff/menu",
  },
  {
    title: "Inventory",
    description: "Monitor stock levels, predict shortages, and trigger rush orders.",
    href: "/staff/inventory",
  },
  {
    title: "Reflections",
    description: "Capture daily system feedback so tomorrow launches on time.",
    href: "/staff/reflection",
  },
  {
    title: "Events",
    description: "Draft proposals, send contracts, and browse archived rituals.",
    href: "/events/archive",
  },
];

export function StaffDashboardPanels() {
  return (
    <div className="relative flex w-full flex-col items-center gap-6 py-16">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-white/50">
          Staff Observatory
        </p>
        <h1 className="text-4xl font-light text-white">
          Snow White Laundry — Orbital Dashboard
        </h1>
        <p className="text-white/60">
          Floating tools suspended over Earth, ready for the next maneuver.
        </p>
      </div>
      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        {modules.map((module, index) => (
          <GlassPanel key={module.title} title={module.title} delay={index * 0.12}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p>{module.description}</p>
              <Link
                href={module.href}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm text-white hover:border-accent hover:text-accent"
              >
                Enter {module.title}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

export default StaffDashboardPanels;
