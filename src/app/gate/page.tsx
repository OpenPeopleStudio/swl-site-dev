"use client";

import { motion } from "framer-motion";
import { LoginPanel } from "@/components/LoginPanel";

type GatePageProps = {
  searchParams?: {
    next?: string;
  };
};

export default function GatePage({ searchParams }: GatePageProps) {
  const nextPath =
    typeof searchParams?.next === "string" && searchParams.next.length > 0
      ? searchParams.next
      : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <Starfield />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <LoginPanel nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}

function Starfield() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/60 to-black" />
      <motion.div
        className="absolute inset-0 opacity-70"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
        transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        style={{
          backgroundImage: "radial-gradient(#00f3ff22 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}
