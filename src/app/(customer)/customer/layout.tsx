"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { OpenPeopleFooter } from "@/components/OpenPeopleFooter";

const navItems = [
  { label: "Home", href: "/customer" },
  { label: "Events", href: "/customer/events" },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const activeLabel = navItems.find((item) => item.href === pathname)?.label ?? "Navigate";
  const drawerId = "customer-nav-drawer";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1a2e_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#0d1117_0%,transparent_40%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/stars.svg')] opacity-20"
      />
      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 sm:px-12 sm:py-24">
        {/* Navigation */}
        <header className="mb-12 rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Snow White Laundry
              </p>
              <h1 className="text-3xl font-light text-white">
                Guest Portal
              </h1>
            </div>
          </div>
          <nav className="mt-4 w-full text-sm">
            <button
              type="button"
              onClick={() => setNavOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-left text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 sm:hidden"
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
              <div className="space-y-3 sm:flex sm:flex-wrap sm:space-y-0 sm:gap-3">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setNavOpen(false)}
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
            </div>
          </nav>
        </header>

        {children}
        <OpenPeopleFooter />
      </main>
    </div>
  );
}
