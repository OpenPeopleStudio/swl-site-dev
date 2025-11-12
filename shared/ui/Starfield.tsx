"use client";

import { motion } from "framer-motion";

export default function Starfield() {
  return (
    <motion.div
      className="fixed inset-0 -z-20 pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 40%, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "2px 2px",
      }}
      animate={{
        backgroundPosition: ["0% 0%", "50% 100%", "0% 0%"],
      }}
      transition={{ duration: 180, repeat: Infinity }}
    />
  );
}
