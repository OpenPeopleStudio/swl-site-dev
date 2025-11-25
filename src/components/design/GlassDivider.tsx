"use client";

interface GlassDividerProps {
  className?: string;
}

export function GlassDivider({ className = "" }: GlassDividerProps) {
  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-white/10 to-transparent ${className}`} />
  );
}
