"use client";

import { type ReactNode } from "react";
import { StarField } from "./StarField";

interface SiteShellProps {
  children: ReactNode;
  className?: string;
}

export function SiteShell({ children, className = "" }: SiteShellProps) {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`} style={{ background: "#000000" }}>
      <StarField />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
