"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ceremonialEntrance } from "@/design/motion";

interface GlassSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
  delay?: number;
}

export function GlassSection({ children, title, className = "", delay = 0 }: GlassSectionProps) {
  return (
    <motion.section
      className={`rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 md:p-10 backdrop-blur-sm ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
    >
      {title && (
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 text-white/90">
          {title}
        </h2>
      )}
      {children}
    </motion.section>
  );
}
