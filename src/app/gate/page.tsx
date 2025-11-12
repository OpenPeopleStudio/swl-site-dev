"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type GateMode = "unknown" | "existing" | "new";

export default function GatePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-white/60">Opening gate…</p>
        </main>
      }
    >
      <Gate />
    </Suspense>
  );
}

function Gate() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => searchParams.get("next") ?? "",
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<GateMode>("unknown");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function resetState(nextEmail: string) {
    setEmail(nextEmail);
    setMode("unknown");
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
    setError("");
  }

  async function lookupEmail() {
    setIsLoading(true);
    setError("");
    setMessage(null);
    try {
      const res = await fetch(
        `/api/gate?email=${encodeURIComponent(email.trim())}`,
      );
      if (!res.ok) {
        throw new Error("Unable to check access");
      }
      const data = (await res.json()) as { exists: boolean; role?: string };
      if (data.exists) {
        setMode("existing");
        setMessage(
          data.role === "staff"
            ? "Crew recognized • enter your passphrase."
            : "Welcome back — enter your password.",
        );
      } else {
        setMode("new");
        setMessage(
          "New guest. Create a password to open the Cortex reflections portal.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (mode === "unknown") {
      await lookupEmail();
      return;
    }

    if (mode === "existing" && !password) {
      setError("Enter your password");
      return;
    }

    if (mode === "new") {
      if (!password || !confirmPassword) {
        setError("Create and confirm your password");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          intent: mode === "new" ? "register" : "login",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Access denied");
      }
      await ensureSupabaseSession(email.trim());
      const destination =
        nextPath || (data.role === "customer" ? "/customer" : "/staff");
      window.location.href = destination;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied");
    } finally {
      setIsLoading(false);
    }
  }

  const buttonLabel =
    mode === "unknown"
      ? "Continue"
      : mode === "new"
        ? "Create Access"
        : "Enter";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,99,255,0.35),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-black/60 p-10 backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">
            SWL Cortex Gate
          </p>
          <h1 className="text-3xl font-light">Welcome</h1>
          <p className="text-sm text-white/60">
            Sign in or create a Snow White Laundry portal profile to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-white/70">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => resetState(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
            />
          </label>

          {mode !== "unknown" && (
            <label className="block text-sm text-white/70">
              {mode === "new" ? "Create Password" : "Password"}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
          )}

          {mode === "new" && (
            <label className="block text-sm text-white/70">
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
          )}

          {message && (
            <p className="text-center text-sm text-white/60">{message}</p>
          )}

          {error && (
            <p className="text-center text-sm text-[#FF5E7A]">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-[#2A63FF] py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#244eda] disabled:opacity-70"
          >
            {isLoading ? "Verifying…" : buttonLabel}
          </button>
        </form>
      </div>
    </main>
  );
}

async function ensureSupabaseSession(email: string) {
  try {
    const res = await fetch("/api/supabase/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return;
    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };
    if (tokens.access_token && tokens.refresh_token) {
      await supabaseBrowser.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    }
  } catch (error) {
    console.warn("Unable to sync Supabase session", error);
  }
}
