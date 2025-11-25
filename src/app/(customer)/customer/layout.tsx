"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { OpenPeopleFooter } from "@/components/OpenPeopleFooter";
import { StarField } from "@/components/design/StarField";

const navItems = [
  { label: "Home", href: "/customer" },
  { label: "Events", href: "/customer/events" },
];

const gateUrl = process.env.NEXT_PUBLIC_GATE_URL ?? "/gate";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const activeLabel = navItems.find((item) => item.href === pathname)?.label ?? "Navigate";
  const drawerId = "customer-nav-drawer";

  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ background: "#000000" }}>
      <StarField />
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
            <a
              href={gateUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/80 transition hover:border-white/60 hover:text-white"
            >
              Staff Login
            </a>
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
                          ? "border-white/80 bg-white/15 text-white shadow-[0_10px_35px_rgba(255,255,255,0.15)]"
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
