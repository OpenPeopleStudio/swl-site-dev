"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

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

  return (
    <nav className={`flex items-center gap-6 sm:gap-8 ${className}`}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs sm:text-sm uppercase tracking-[0.2em] transition-colors duration-400 ${
              isActive ? "text-white/90" : "text-white/40 hover:text-white/60"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
