"use client";

import { motion } from "framer-motion";
import { ceremonialEntrance } from "@/design/motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <motion.header
      className={`mb-16 sm:mb-20 md:mb-24 lg:mb-32 ${className}`}
      {...ceremonialEntrance}
    >
      {subtitle && (
        <motion.p
          className="mb-4 sm:mb-6 text-xs sm:text-sm uppercase tracking-[0.5em] text-white/40 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
        >
          {subtitle}
        </motion.p>
      )}
      <motion.h1
        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-wide text-white/90"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 1 }}
      >
        {title}
      </motion.h1>
    </motion.header>
  );
}
