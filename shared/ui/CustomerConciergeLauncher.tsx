"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { ConciergeWidget } from "@/components/concierge/ConciergeWidget";

const HIDDEN_PREFIXES = ["/staff", "/gate"];

export function CustomerConciergeLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"day" | "night">(() => readDocumentTheme());

  if (
    pathname &&
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode(readDocumentTheme());
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/15 bg-white/5 text-white shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:bottom-10 md:right-10"
      >
        <Sparkles className="h-5 w-5" />
        <span className="sr-only">Open concierge</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed bottom-24 right-4 z-50 w-[min(460px,calc(100vw-2rem))]"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/20 bg-black/40 p-2 text-white/80 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close concierge</span>
                </button>
              </div>
              <ConciergeWidget mode={mode} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function readDocumentTheme(): "day" | "night" {
  if (typeof document === "undefined") return "night";
  const current = document.documentElement.dataset.theme;
  return current === "day" || current === "night" ? current : "night";
}

export default CustomerConciergeLauncher;
