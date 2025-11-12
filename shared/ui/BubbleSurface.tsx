"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type BubbleSurfaceProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function BubbleSurface({
  children,
  delay = 0,
  className = "",
}: BubbleSurfaceProps) {
  return (
    <motion.div
      className={`glass-morphic rounded-2xl overflow-hidden ${className}`}
      animate={{ y: [0, -2, 0] }}
      transition={{
        delay,
        duration: 10 + delay,
        repeat: Infinity,
        repeatType: "mirror",
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
}
