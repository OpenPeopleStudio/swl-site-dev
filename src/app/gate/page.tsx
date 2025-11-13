"use client";

import type { CSSProperties } from "react";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { LoginPanel } from "@/components/LoginPanel";

const EUROSTILE_STACK =
  "var(--font-eurostile), 'Eurostile', 'Bank Gothic', 'Microgramma', sans-serif";
const HELVETICA_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const HERO_HEADING_STYLE: CSSProperties = {
  fontFamily: EUROSTILE_STACK,
  letterSpacing: "0.35em",
};

const HERO_COPY_STYLE: CSSProperties = {
  fontFamily: HELVETICA_STACK,
  letterSpacing: "0.12em",
};

const GATE_SURFACE_STYLE: CSSProperties & Record<string, string> = {
  "--accent": "#f6f4f0",
  "--glass": "rgba(255,255,255,0.08)",
};

export default function GatePage() {
  return (
    <Suspense fallback={<GateSuspenseFallback />}>
      <GateSurface />
    </Suspense>
  );
}

function GateSurface() {
  const params = useSearchParams();
  const rawNext = params?.get("next") ?? "";
  const nextPath = rawNext.length > 0 ? rawNext : undefined;

  return (
    <main
      className="gate-surface relative min-h-screen overflow-hidden bg-[#01030f] text-white"
      style={GATE_SURFACE_STYLE}
    >
      <Starfield />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 space-y-4"
        >
          <p
            className="text-[0.7rem] uppercase tracking-[0.45em] text-white/50"
            style={HERO_COPY_STYLE}
          >
            Guest Arrival
          </p>
          <h1
            className="text-4xl font-light text-white md:text-5xl"
            style={HERO_HEADING_STYLE}
          >
            Snow White Laundry · Prelude
          </h1>
          <p className="text-base text-white/75" style={HERO_COPY_STYLE}>
            Begin your reservation or explore private dining options.
          </p>
          <p className="text-sm text-white/55" style={HERO_COPY_STYLE}>
            An experience shaped with intention, emotion, and craft.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="relative flex w-full max-w-xl justify-center"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_70%)] blur-[180px]" />
          <LoginPanel nextPath={nextPath} />
        </motion.div>
      </div>
    </main>
  );
}

function GateSuspenseFallback() {
  return (
    <main
      className="gate-surface flex min-h-screen items-center justify-center bg-[#01030f] text-white"
      style={GATE_SURFACE_STYLE}
    >
      <p className="text-sm uppercase tracking-[0.4em] text-white/50">Initializing gate…</p>
    </main>
  );
}

function Starfield() {
  const starLayers = [
    {
      size: 280,
      opacity: 0.15,
      duration: 110,
      travel: ["0% 0%", "-40% 25%"],
      glow: "drop-shadow(0 0 8px rgba(255,255,255,0.45))",
    },
    {
      size: 160,
      opacity: 0.2,
      duration: 150,
      travel: ["0% 0%", "55% -35%"],
      glow: "drop-shadow(0 0 10px rgba(248,250,252,0.35))",
    },
    {
      size: 72,
      opacity: 0.25,
      duration: 220,
      travel: ["0% 0%", "-60% -40%"],
      glow: "drop-shadow(0 0 12px rgba(255,255,255,0.3))",
    },
  ];

  const nebulae = [
    {
      position: { top: "-18%", left: "-8%" },
      size: 520,
      from: "rgba(255,255,255,0.2)",
      to: "rgba(5,7,13,0)",
      duration: 42,
      rotate: 6,
    },
    {
      position: { bottom: "-25%", right: "-10%" },
      size: 680,
      from: "rgba(255,255,255,0.14)",
      to: "rgba(2,3,7,0)",
      duration: 56,
      rotate: -4,
    },
    {
      position: { top: "12%", right: "12%" },
      size: 360,
      from: "rgba(255,255,255,0.12)",
      to: "rgba(1,3,8,0)",
      duration: 38,
      rotate: 12,
    },
  ];

  const orbitRings = [
    {
      size: "60vw",
      color: "rgba(255,255,255,0.12)",
      opacity: 0.25,
      duration: 160,
    },
    {
      size: "82vw",
      color: "rgba(255,255,255,0.08)",
      opacity: 0.2,
      duration: 220,
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#05070d] to-[#010106]" />
      <motion.div
        className="absolute inset-x-[-15%] top-[-20%] h-[120vh] opacity-25 blur-[160px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.12), transparent 65%)",
        }}
        animate={{ rotate: [0, 8, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
      />
      {starLayers.map((layer, index) => (
        <motion.div
          key={`star-layer-${index}`}
          className="absolute inset-0 mix-blend-screen"
          style={{
            opacity: layer.opacity,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.5) 0.7px, transparent 0.7px)",
            backgroundSize: `${layer.size}px ${layer.size}px`,
            filter: layer.glow,
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
      {nebulae.map((nebula, index) => (
        <motion.div
          key={`nebula-${index}`}
          className="absolute rounded-full blur-[120px]"
          style={{
            ...nebula.position,
            width: nebula.size,
            height: nebula.size,
            background: `radial-gradient(circle, ${nebula.from} 0%, ${nebula.to} 70%)`,
          }}
          animate={{ rotate: nebula.rotate }}
          transition={{
            duration: nebula.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
      {orbitRings.map((ring, index) => (
        <motion.div
          key={`ring-${index}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            width: ring.size,
            height: ring.size,
            borderColor: ring.color,
            opacity: ring.opacity,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: ring.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[320px] bg-gradient-to-t from-black via-[#05070d] to-transparent" />
      <ShootingStars />
    </div>
  );
}

function ShootingStars() {
  const traces = [
    { top: "18%", left: "10%", angle: -25, distance: 900, delay: 2.2, duration: 5.5 },
    { top: "46%", left: "75%", angle: 155, distance: 700, delay: 4.5, duration: 6.3 },
    { top: "72%", left: "20%", angle: -5, distance: 600, delay: 7.5, duration: 4.8 },
  ];

  return (
    <>
      {traces.map((trace, index) => {
        const radians = (trace.angle * Math.PI) / 180;
        const dx = Math.cos(radians) * trace.distance;
        const dy = Math.sin(radians) * trace.distance;
        return (
          <motion.span
            key={`shooting-${index}`}
            className="pointer-events-none absolute h-px w-32 origin-left bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-0 mix-blend-screen"
            style={{
              top: trace.top,
              left: trace.left,
              rotate: trace.angle,
            }}
            animate={{
              x: [0, dx],
              y: [0, dy],
              opacity: [0, 0.9, 0],
            }}
            transition={{
              duration: trace.duration,
              delay: trace.delay,
              repeat: Infinity,
              repeatDelay: 6,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}
