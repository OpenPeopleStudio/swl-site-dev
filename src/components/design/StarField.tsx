"use client";

import { motion } from "framer-motion";
import { starfieldLayers } from "@/design/atmosphere";

interface StarFieldProps {
  className?: string;
}

const pulseSpecs = [
  { top: "12%", left: "18%", delay: 0 },
  { top: "68%", left: "72%", delay: 1.2 },
  { top: "42%", left: "48%", delay: 2.1 },
];

export function StarField({ className = "" }: StarFieldProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {starfieldLayers.map((layer, index) => (
        <motion.div
          key={`star-layer-${index}`}
          className="absolute inset-0 mix-blend-screen"
          style={{
            opacity: layer.opacity,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.45) 0.4px, transparent 0.4px)",
            backgroundSize: `${layer.size}px ${layer.size}px`,
            willChange: "background-position",
          }}
          animate={{ backgroundPosition: layer.travel }}
          transition={{
            duration: layer.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {pulseSpecs.map((pulse) => (
        <motion.span
          key={pulse.top}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.7)]"
          style={{ top: pulse.top, left: pulse.left }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.18, 1] }}
          transition={{ duration: 6, repeat: Infinity, delay: pulse.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
