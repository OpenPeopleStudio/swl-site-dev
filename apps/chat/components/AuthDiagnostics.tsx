"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const LABELS: Record<string, string> = {
  checking: "Checking auth…",
  missing: "❌ No Supabase session – sign in required.",
  rls: "⚠️ Auth OK but RLS rejected chat query.",
  ok: "✅ Auth + RLS verified.",
  error: "⚠️ Unexpected auth error.",
};

export default function AuthDiagnostics() {
  const [state, setState] = useState<"checking" | "missing" | "rls" | "ok" | "error">("checking");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function runDiagnostics() {
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (!mounted) return;
      if (error) {
        setState("error");
        setDetails(error.message);
        return;
      }
      if (!data?.user) {
        setState("missing");
        return;
      }

      const test = await supabaseBrowser.from("messages").select("id").limit(1);
      if (!mounted) return;
      if (test.error) {
        setState("rls");
        setDetails(test.error.message);
      } else {
        setState("ok");
        setDetails(null);
      }
    }

    void runDiagnostics();

    return () => {
      mounted = false;
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[60] max-w-xs rounded-2xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 shadow-lg">
      <p>{LABELS[state]}</p>
      {details && <p className="mt-1 text-[11px] text-white/60">{details}</p>}
    </div>
  );
}
