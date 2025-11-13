"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";
import BootSequence from "@/components/boot/BootSequence";

const navItems = [
  { label: "Home", href: "/staff" },
  { label: "Schedule", href: "/staff/schedule" },
  { label: "Menu", href: "/staff/menu" },
  { label: "Events", href: "/staff/events" },
  { label: "Inventory", href: "/staff/inventory" },
  { label: "Reflection", href: "/staff/reflection" },
];

const BOOT_SEEN_KEY = "swl-staff-booted";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bootState = useSyncExternalStore(
    subscribeToBootPreference,
    () => readBootPreference(),
    () => "pending",
  );

  function handleBootComplete() {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(BOOT_SEEN_KEY, "true");
      } catch {
        // Ignore storage failures (private browsing, etc.)
      }
    }
    notifyBootPreferenceChange();
  }

  return (
    <>
      {bootState === "show" && <BootSequence onFinish={handleBootComplete} />}
      <main
        className="relative min-h-screen overflow-hidden bg-space-gradient text-white"
        aria-hidden={bootState === "show"}
      >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#1b1f33,transparent_70%)]" />

      <motion.div
        aria-hidden="true"
        className="parallax-stars absolute inset-0 bg-[url('/stars.svg')] opacity-30"
        animate={{ backgroundPositionY: ["0%", "100%"] }}
        transition={{ repeat: Infinity, duration: 120, ease: "linear" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center gap-8 px-4 py-8 sm:px-8">
        <header className="glass-surface panel-outline w-full max-w-5xl rounded-[32px] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Snow White Laundry
              </p>
              <h1 className="text-3xl font-light text-white">
                Cortex Orbital Console
              </h1>
            </div>
            <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
              Authenticated
            </span>
          </div>
          <nav className="mt-4 w-full text-sm">
            <div className="flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-w-[120px] flex-1 items-center justify-center rounded-2xl border px-4 py-2 text-center transition sm:min-w-0 ${
                      isActive
                        ? "border-white/80 bg-white/15 text-white shadow-[0_10px_35px_rgba(42,99,255,0.35)]"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <section className="flex w-full max-w-5xl flex-1 items-start justify-center pb-10">
          {children}
        </section>
      </div>
      </main>
    </>
  );
}

const bootListeners = new Set<() => void>();

function subscribeToBootPreference(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  bootListeners.add(listener);
  return () => {
    bootListeners.delete(listener);
  };
}

function notifyBootPreferenceChange() {
  bootListeners.forEach((listener) => listener());
}

function readBootPreference(): "show" | "hidden" {
  if (typeof window === "undefined") {
    return "show";
  }
  try {
    const seen = sessionStorage.getItem(BOOT_SEEN_KEY);
    return seen === "true" ? "hidden" : "show";
  } catch {
    return "show";
  }
}
