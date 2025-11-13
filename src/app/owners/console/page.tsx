"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OwnerConsole } from "@/components/owner/OwnerConsole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const OWNER_ROLE = "owner";
const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export default function OwnerConsolePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const fallbackAllowedEmails = useMemo(() => new Set(OWNER_EMAILS), []);

  useEffect(() => {
    let mounted = true;

    async function verifyOwner() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      const session = data.session;
      const email = session?.user.email?.toLowerCase();
      const role =
        (session?.user.app_metadata?.role as string | undefined) ??
        (session?.user.user_metadata?.role as string | undefined);
      const isOwner =
        role === OWNER_ROLE || (email && (role === "admin" || fallbackAllowedEmails.has(email)));

      if (isOwner) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
        router.replace("/gate");
      }
    }

    void verifyOwner();
    return () => {
      mounted = false;
    };
  }, [fallbackAllowedEmails, router]);

  if (authorized === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02030a] text-white">
        <p className="text-xs uppercase tracking-[0.45em] text-white/50">Verifying owner access…</p>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return <OwnerConsole />;
}
