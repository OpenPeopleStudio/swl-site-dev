"use client";

import { motion } from "framer-motion";
import { starfieldLayers, ambientGlow } from "@/design/atmosphere";

interface StarFieldProps {
  className?: string;
}

export function StarField({ className = "" }: StarFieldProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Starfield layers */}
      {starfieldLayers.map((layer, index) => (
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
        className="absolute inset-x-[-10%] top-[-15%] h-[110vh] blur-[140px]"
        style={{
          opacity: ambientGlow.opacity,
          background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)",
        }}
        animate={{ rotate: ambientGlow.rotation }}
        transition={{
          duration: ambientGlow.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
