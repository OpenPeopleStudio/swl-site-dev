"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/prelude", label: "Prelude" },
  { href: "/reserve", label: "Reserve" },
  { href: "/contact", label: "Contact" },
];

export function GlassNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  return (
    <nav
      className={`pointer-events-none fixed left-1/2 top-6 z-40 -translate-x-1/2 ${className}`}
    >
      <div
        className="pointer-events-auto flex flex-col items-center gap-3"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-6 py-3 text-white shadow-[0_25px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
        >
          <span className="text-[0.55rem] uppercase tracking-[0.5em] text-white/75">
            Snow White Laundry
          </span>
          <span className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.45em] text-white/45">
            Hover or tap to navigate
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs"
            >
              ⌄
            </motion.span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={panelId}
              key="glass-nav-panel"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-[32px] border border-white/12 bg-white/[0.05] px-5 py-3 shadow-[0_30px_110px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsExpanded(false)}
                    className="relative overflow-hidden rounded-full px-4 py-2 text-[0.6rem] uppercase tracking-[0.45em]"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="swl-nav-pill"
                        className="absolute inset-0 rounded-full bg-white/15 shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      />
                    )}
                    <span
                      className={`relative ${
                        isActive ? "text-white" : "text-white/65 hover:text-white/90"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
