"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import BootSequence from "@/components/boot/BootSequence";
import { StarField } from "@/components/design/StarField";

const navItems = [
  { label: "Home", href: "/staff" },
  { label: "Schedule", href: "/staff/schedule" },
  { label: "Menu", href: "/staff/menu" },
  { label: "Menu Builder", href: "/staff/menu/builder" },
  { label: "Events", href: "/staff/events" },
  { label: "Inventory", href: "/staff/inventory" },
  { label: "Reflection", href: "/staff/reflection" },
  { label: "Settings", href: "/staff/settings" },
];

const BOOT_SEEN_KEY = "swl-staff-booted";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bootState = useSyncExternalStore(
    subscribeToBootPreference,
    () => readBootPreference(),
    () => "pending",
  );
  const [navOpen, setNavOpen] = useState(false);
  const activeLabel = navItems.find((item) => item.href === pathname)?.label ?? "Navigate";
  const drawerId = "staff-nav-drawer";

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
        className="staff-shell relative min-h-screen overflow-hidden text-white"
        style={{ background: "#000000" }}
        aria-hidden={bootState === "show"}
        data-shell="staff"
      >
        <StarField className="-z-10 opacity-80 pointer-events-none" />

        <div className="staff-shell__inner relative z-10 flex min-h-screen flex-col items-center gap-8 sm:gap-10 md:gap-12 px-4 py-10 sm:py-12 md:py-14">
          <header className="w-full rounded-[28px] border border-white/10 bg-white/[0.02] px-5 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Snow White Laundry
              </p>
              <h1 className="text-3xl font-light text-white">
                Orb
              </h1>
            </div>
            <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
              Authenticated
            </span>
          </div>
          <nav className="mt-5 sm:mt-6 w-full text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setNavOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-3 text-left uppercase tracking-[0.35em] text-white/70 transition hover:border-white/35 sm:hidden"
              aria-expanded={navOpen}
              aria-controls={drawerId}
            >
              {activeLabel}
              <span
                className={`text-lg transition-transform ${navOpen ? "-rotate-90" : "rotate-90"}`}
                aria-hidden="true"
              >
                ❯
              </span>
            </button>
            <div
              id={drawerId}
              className={`overflow-hidden pb-2 transition-[max-height,opacity] duration-300 sm:max-h-none sm:overflow-visible sm:pb-0 ${
                navOpen
                  ? "max-h-[480px] opacity-100 pt-3"
                  : "max-h-0 opacity-0 sm:max-h-none sm:opacity-100 sm:pt-0"
              }`}
            >
              <div className="space-y-3 sm:flex sm:flex-wrap sm:space-y-0 sm:gap-3 md:gap-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setNavOpen(false)}
                      className={`flex min-w-[120px] flex-1 items-center justify-center rounded-2xl border px-4 sm:px-6 py-2.5 text-center transition sm:min-w-0 ${
                        isActive
                          ? "border-white/70 bg-white/15 text-white shadow-[0_8px_25px_rgba(255,255,255,0.12)]"
                          : "border-white/10 bg-transparent text-white/65 hover:border-white/35 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
          </header>

          <section className="flex w-full flex-1 items-start justify-center pb-12 sm:pb-14 md:pb-16">
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
