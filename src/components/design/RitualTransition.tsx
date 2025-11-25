"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ceremonialEntrance, ritualTransition } from "@/design/motion";

interface RitualTransitionProps {
  children: ReactNode;
  show?: boolean;
}

export function RitualTransition({ children, show = true }: RitualTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          {...ceremonialEntrance}
          transition={ritualTransition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
