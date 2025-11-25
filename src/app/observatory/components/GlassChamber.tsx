"use client";

import { type ReactNode, useMemo } from "react";
import { motion } from "framer-motion";

interface GlassChamberProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function GlassChamber({ children, title, className = "" }: GlassChamberProps) {
  const seed = `${title ?? "glass-chamber"}-${className}`;
  const { driftAmplitude, driftPeriod, phaseOffset } = useMemo(() => {
    return {
      driftAmplitude: seededFloat(`${seed}-amp`, 2, 4),
      driftPeriod: seededFloat(`${seed}-period`, 10, 14),
      phaseOffset: seededFloat(`${seed}-phase`, 0, Math.PI * 2),
    };
  }, [seed]);

  return (
    <motion.div
      className={`relative backdrop-blur-[20px] border border-white/10 rounded-xl bg-white/[0.02] p-8 sm:p-10 md:p-12 ${className}`}
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

function seededFloat(key: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
}
