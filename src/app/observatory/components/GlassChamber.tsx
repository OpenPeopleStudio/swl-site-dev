"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassChamberProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function GlassChamber({ children, title, className = "" }: GlassChamberProps) {
  // Drift physics: 2-4px amplitude, 10-14s period, random phase
  const driftAmplitude = 2 + Math.random() * 2; // 2-4px
  const driftPeriod = 10 + Math.random() * 4; // 10-14s
  const phaseOffset = Math.random() * Math.PI * 2;

  return (
    <motion.div
      className={`relative backdrop-blur-[20px] border border-white/10 rounded-xl bg-white/[0.02] p-6 ${className}`}
      style={{
        boxShadow: "0 0 40px rgba(255,255,255,0.03), inset 0 0 20px rgba(255,255,255,0.01)",
      }}
      animate={{
        x: [
          Math.sin(phaseOffset) * driftAmplitude,
          Math.sin(phaseOffset + Math.PI) * driftAmplitude,
          Math.sin(phaseOffset) * driftAmplitude,
        ],
        y: [
          Math.cos(phaseOffset) * driftAmplitude,
          Math.cos(phaseOffset + Math.PI) * driftAmplitude,
          Math.cos(phaseOffset) * driftAmplitude,
        ],
      }}
      transition={{
        duration: driftPeriod,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        borderColor: "rgba(255,255,255,0.15)",
        boxShadow: "0 0 50px rgba(255,255,255,0.05), inset 0 0 30px rgba(255,255,255,0.02)",
      }}
    >
      {title && (
        <h3 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 font-light">
          {title}
        </h3>
      )}
      {children}
    </motion.div>
  );
}
