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
      className={`mb-6 sm:mb-8 md:mb-10 ${className}`}
      {...ceremonialEntrance}
    >
      {subtitle && (
        <motion.p
          className="mb-2 sm:mb-3 text-xs uppercase tracking-[0.5em] text-white/40 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
        >
          {subtitle}
        </motion.p>
      )}
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl font-light tracking-wide text-white/90"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 1 }}
      >
        {title}
      </motion.h1>
    </motion.header>
  );
}
