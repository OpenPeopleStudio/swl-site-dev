"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface ObservatoryShellProps {
  children: ReactNode;
}

export function ObservatoryShell({ children }: ObservatoryShellProps) {
  // Sparse starfield layers
  const starLayers = [
    {
      size: 320,
      opacity: 0.08,
      duration: 140,
      travel: ["0% 0%", "-35% 20%"],
    },
    {
      size: 180,
      opacity: 0.12,
      duration: 180,
      travel: ["0% 0%", "50% -30%"],
    },
    {
      size: 90,
      opacity: 0.15,
      duration: 240,
      travel: ["0% 0%", "-55% -35%"],
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Starfield layers */}
      {starLayers.map((layer, index) => (
        <motion.div
          key={`star-layer-${index}`}
          className="absolute inset-0 mix-blend-screen"
          style={{
            opacity: layer.opacity,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 0.5px, transparent 0.5px)",
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

      {/* Soft ambient glow */}
      <motion.div
        className="absolute inset-x-[-10%] top-[-15%] h-[110vh] opacity-15 blur-[140px]"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)",
        }}
        animate={{ rotate: [0, 6, 0] }}
        transition={{ duration: 80, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
