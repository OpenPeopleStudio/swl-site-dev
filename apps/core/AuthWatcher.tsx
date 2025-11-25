"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

export function AuthWatcher() {
  const [sessionState, setSessionState] = useState<{
    email?: string | null;
    status: "checking" | "active" | "missing";
  }>({ status: "checking" });

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setSessionState({
          status: "active",
          email: data.session.user.email,
        });
      } else {
        setSessionState({ status: "missing" });
      }
    }

    void hydrate();
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      (_event: unknown, session: Session | null) => {
        if (!mounted) return;
        if (session) {
          setSessionState({
            status: "active",
            email: session.user.email,
          });
        } else {
          setSessionState({ status: "missing" });
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionState.status === "active" && sessionState.email) {
      console.info("✅ Cortex Auth Active:", sessionState.email);
    } else if (sessionState.status === "missing") {
      console.warn("⚠️ Cortex Auth Missing — chat may fail.");
    }
  }, [sessionState]);

  return null;
}
