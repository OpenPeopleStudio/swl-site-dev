"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { getReflectionStyles, getHoverReflection } from "@/design/reflections";

interface GlassCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, title, className = "", hover = true }: GlassCardProps) {
  return (
    <motion.div
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 md:p-10 backdrop-blur-sm ${className}`}
      style={getReflectionStyles('soft')}
      whileHover={hover ? getHoverReflection('medium') : undefined}
      transition={{ duration: 0.4 }}
    >
      {title && (
        <h3 className="text-xl sm:text-2xl font-light mb-4 text-white/90">
          {title}
        </h3>
      )}
      {children}
    </motion.div>
  );
}
