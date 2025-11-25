"use client";

import { motion } from "framer-motion";

interface DriftPlotProps {
  data: number[];
  className?: string;
  height?: number;
}

export function DriftPlot({ data, className = "", height = 40 }: DriftPlotProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Generate path points
  const pathPoints = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { x, y };
  });

  const pathString = pathPoints.map((p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(" ");

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.1))" }}
      >
        <motion.path
          d={pathString}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Subtle fill */}
        <motion.path
          d={`${pathString} L 100 100 L 0 100 Z`}
          fill="rgba(255,255,255,0.02)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
