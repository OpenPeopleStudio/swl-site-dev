"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { generateDrift } from "@/design/motion";
import { getReflectionStyles, getHoverReflection } from "@/design/reflections";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  drift?: boolean;
  hover?: boolean;
}

export function GlassPanel({ children, className = "", drift = true, hover = true }: GlassPanelProps) {
  const driftValues = drift ? generateDrift() : undefined;
  const reflectionStyles = getReflectionStyles('soft');

  return (
    <motion.div
      className={`relative backdrop-blur-[20px] border border-white/10 rounded-xl bg-white/[0.02] ${className}`}
      style={reflectionStyles}
      animate={driftValues}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={hover ? getHoverReflection('medium') : undefined}
    >
      {children}
    </motion.div>
  );
}
