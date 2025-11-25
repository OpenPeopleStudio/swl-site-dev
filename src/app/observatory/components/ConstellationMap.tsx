"use client";

import { motion } from "framer-motion";

function deterministicOffset(key: string, magnitude: number) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return (normalized - 0.5) * magnitude;
}

interface ConstellationMapProps {
  nodes: Array<{ id: string; x: number; y: number; links: number }>;
  edges: Array<{ from: string; to: string }>;
  className?: string;
}

export function ConstellationMap({ nodes, edges, className = "" }: ConstellationMapProps) {
  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: 300 }}>
        <span className="text-xs text-white/20 font-light italic">No graph data</span>
      </div>
    );
  }

  // Simple force-directed layout simulation
  // For now, use a circular layout with some randomization
  const centerX = 50;
  const centerY = 50;
  const radius = 35;

  const positionedNodes = nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    const distance = radius + (node.links % 3) * 2; // Vary distance by link count
    const jitterX = deterministicOffset(`${node.id}-x`, 5);
    const jitterY = deterministicOffset(`${node.id}-y`, 5);
    return {
      ...node,
      x: centerX + Math.cos(angle) * distance + jitterX,
      y: centerY + Math.sin(angle) * distance + jitterY,
    };
  });

  return (
    <div className={`relative ${className}`} style={{ height: 300 }}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.1))" }}
      >
        {/* Edges */}
        {edges.slice(0, 50).map((edge, index) => {
          const fromNode = positionedNodes.find((n) => n.id === edge.from);
          const toNode = positionedNodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <motion.line
              key={`edge-${index}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: index * 0.01 }}
            />
          );
        })}

        {/* Nodes */}
        {positionedNodes.map((node, index) => {
          const glowIntensity = Math.min(1, node.links / 5); // More links = brighter
          return (
            <motion.circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={0.8 + glowIntensity * 0.4}
              fill="rgba(255,255,255,0.4)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 0.3 + glowIntensity * 0.2,
                scale: 1,
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.02,
                ease: "easeOut",
              }}
              style={{
                filter: `drop-shadow(0 0 ${1 + glowIntensity * 2}px rgba(255,255,255,0.3))`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
