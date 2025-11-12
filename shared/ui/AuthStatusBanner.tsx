"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function AuthStatusBanner() {
  const [text, setText] = useState("Checking auth…");

  useEffect(() => {
    let mounted = true;
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data?.user) {
        setText(`✅ ${data.user.email}`);
      } else {
        setText("⚠️ Not logged in");
      }
    });

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setText(
          session?.user ? `✅ ${session.user.email}` : "⚠️ Session missing",
        );
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[70] rounded-full bg-black/70 px-3 py-1 text-xs text-white/70 shadow-lg">
      {text}
    </div>
  );
}
