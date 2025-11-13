"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type LoginPanelProps = {
  nextPath?: string;
  wakeSignal?: number;
};

type GateResponse = {
  role?: string;
};

const EUROSTILE_STACK =
  "var(--font-eurostile), 'Eurostile', 'Bank Gothic', 'Microgramma', sans-serif";
const HELVETICA_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const HEADING_FONT: CSSProperties = {
  fontFamily: EUROSTILE_STACK,
  letterSpacing: "0.35em",
};

const BODY_FONT: CSSProperties = {
  fontFamily: HELVETICA_STACK,
  letterSpacing: "0.05em",
};

export function LoginPanel({ nextPath, wakeSignal = 0 }: LoginPanelProps) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Standing by…");
  const [showSignupFields, setShowSignupFields] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const heading = exists ? "swlOS" : "Snow White Laundry · The Prelude";
  const eyebrow = exists
    ? "Welcome back. RestaurantOS is preparing your station."
    : "Snow White Laundry";
  const subline = exists
    ? "Syncing rosters, requests, and nightly briefs…"
    : "Begin the prelude. Let us know who's arriving.";

  useEffect(() => {
    if (wakeSignal > 0) {
      emailRef.current?.focus();
    }
  }, [wakeSignal]);

  function resetFields(value: string) {
    setEmail(value);
    setPassword("");
    setConfirmPassword("");
    setExists(null);
    setShowSignupFields(false);
    setError(null);
    setStatus("Standing by…");
    setNeedsReset(false);
    setResetPassword("");
    setResetConfirm("");
  }

  async function checkUser() {
    if (!email.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        throw new Error("Unable to check user");
      }
      const payload = (await res.json()) as { exists: boolean };
      setExists(payload.exists);
      setShowSignupFields(false);
      setStatus(
        payload.exists
          ? "Syncing rosters, requests, and nightly briefs…"
          : "New signal — create credentials to proceed.",
      );
    } catch (err) {
      console.error(err);
      setExists(null);
      setStatus("Unable to verify email. Try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (exists === null) {
      await checkUser();
      return;
    }

    if (needsReset) {
      if (!resetPassword || !resetConfirm) {
        setError("Create and confirm your new password.");
        return;
      }
      if (resetPassword !== resetConfirm) {
        setError("New passwords do not match.");
        return;
      }
      await authenticate("login", { newPassword: resetPassword });
      return;
    }

    if (exists) {
      if (!password) {
        setError("Enter your password.");
        return;
      }
      await authenticate("login");
      return;
    }

    if (!showSignupFields) {
      setShowSignupFields(true);
      setStatus("New signal — create credentials to proceed.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Create and confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    await authenticate("register");
  }

  const buttonLabel = useMemo(() => {
    if (needsReset) return submitting ? "Updating…" : "Update Passphrase";
    if (exists === null) return checking ? "Scanning…" : "Begin";
    if (exists) return submitting ? "Loading…" : "Enter RestaurantOS";
    if (!showSignupFields) return "Begin";
    return submitting ? "Creating…" : "Create Access";
  }, [exists, showSignupFields, submitting, checking, needsReset]);

  async function authenticate(
    intent: "login" | "register",
    overrides?: { newPassword?: string },
  ) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          intent,
          newPassword: overrides?.newPassword,
        }),
      });
      const payload = (await res.json()) as GateResponse & {
        error?: string;
        requiresPasswordReset?: boolean;
      };
      if (res.status === 409 && payload.requiresPasswordReset) {
        setNeedsReset(true);
        setStatus("Your passphrase needs renewal. Update to continue.");
        setError(null);
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        throw new Error(payload.error ?? "Access denied");
      }
      const finalPassword = overrides?.newPassword ?? password;
      await ensureSupabaseLogin(email.trim(), finalPassword);
      setNeedsReset(false);
      setResetPassword("");
      setResetConfirm("");
      const destination =
        nextPath ??
        (payload.role === "owner"
          ? "/owners/console"
          : payload.role === "customer"
            ? "/customer"
            : "/staff");
      setStatus("RestaurantOS is ready.");
      setTimeout(() => {
        router.replace(destination);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{
        scale: submitting ? 0.92 : 1,
        opacity: submitting ? 0 : 1,
      }}
      transition={{ duration: submitting ? 0.6 : 1.2, ease: [0.12, 0.9, 0.39, 1] }}
      className="gate-holo-panel relative w-full max-w-lg space-y-10 text-gray-100"
      style={BODY_FONT}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[inherit] opacity-35 blur-[200px]"
          animate={{ rotate: [0, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle at 35% 20%, rgba(68,83,255,0.24), transparent 55%), radial-gradient(circle at 70% 60%, rgba(6,236,255,0.2), transparent 60%)",
          }}
        />
        <div className="absolute -top-28 left-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(62,92,255,0.25),transparent_70%)] opacity-70 blur-[150px]" />
        <div className="absolute -bottom-36 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(10,245,255,0.16),transparent_75%)] opacity-70 blur-[210px]" />
      </div>

      <motion.div
        key={exists ? "welcomeBack" : "welcome"}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="text-center space-y-2"
      >
        <p
          className="text-[0.58rem] uppercase tracking-[0.4em] text-white/45"
          style={BODY_FONT}
        >
          {eyebrow}
        </p>
        <h1
          className="text-[2rem] font-light uppercase text-white md:text-[2.5rem]"
          style={HEADING_FONT}
        >
          {heading}
        </h1>
        <p className="text-[0.95rem] text-white/65" style={BODY_FONT}>
          {subline}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="block text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
          Access Email
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(event) => resetFields(event.target.value)}
            onBlur={checkUser}
            placeholder="you@snowwhitelaundry.co"
            className="mt-3 w-full rounded-[18px] border border-white/12 bg-white/5 px-5 py-3 text-[0.95rem] text-white placeholder:text-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition focus:border-white focus:bg-transparent focus:shadow-[0_28px_70px_rgba(0,0,0,0.65)] focus:outline-none"
            required
          />
        </label>

        <AnimatePresence initial={false}>
          {exists && (
            <motion.label
              key="password-existing"
              className="block text-[0.6rem] uppercase tracking-[0.35em] text-white/40"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              Passphrase
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-3 w-full rounded-[18px] border border-white/12 bg-white/5 px-5 py-3 text-[0.95rem] text-white placeholder:text-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition focus:border-white focus:bg-transparent focus:shadow-[0_28px_70px_rgba(0,0,0,0.65)] focus:outline-none"
                required
              />
            </motion.label>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {needsReset && (
            <motion.div
              key="reset-fields"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-5"
            >
              <label className="block text-xs uppercase tracking-[0.4em] text-white/40">
                Set New Passphrase
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="••••••••"
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-[0.95rem] text-white placeholder:text-white/40 shadow-[0_12px_45px_rgba(0,0,0,0.5)] transition focus:border-white/70 focus:bg-transparent focus:shadow-[0_26px_70px_rgba(0,0,0,0.65)] focus:outline-none"
                  required
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.4em] text-white/40">
                Confirm New Passphrase
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(event) => setResetConfirm(event.target.value)}
                  placeholder="••••••••"
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-[0.95rem] text-white placeholder:text-white/40 shadow-[0_12px_45px_rgba(0,0,0,0.5)] transition focus:border-white/70 focus:bg-transparent focus:shadow-[0_26px_70px_rgba(0,0,0,0.65)] focus:outline-none"
                  required
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {!exists && showSignupFields && (
            <motion.div
              key="signup-fields"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-5"
            >
              <label className="block text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
                Create Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="mt-3 w-full rounded-[18px] border border-white/15 bg-black/20 px-5 py-3 text-base text-white placeholder:text-white/40 shadow-[0_15px_45px_rgba(0,0,0,0.55)] transition focus:border-white focus:bg-transparent focus:shadow-[0_35px_85px_rgba(0,0,0,0.8)] focus:outline-none"
                  required
                />
              </label>
              <label className="block text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="mt-3 w-full rounded-[18px] border border-white/15 bg-black/20 px-5 py-3 text-base text-white placeholder:text-white/40 shadow-[0_15px_45px_rgba(0,0,0,0.55)] transition focus:border-white focus:bg-transparent focus:shadow-[0_35px_85px_rgba(0,0,0,0.8)] focus:outline-none"
                  required
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-[18px] border border-white/6 bg-white/5 px-4 py-4 text-center text-[0.6rem] uppercase tracking-[0.28em] text-white/65 shadow-[0_18px_55px_rgba(0,0,0,0.6)]">
          {status}
        </div>

        {error && (
          <p className="rounded-2xl border border-white/12 bg-white/5 px-4 py-2 text-center text-xs font-semibold text-red-200">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.01 }}
          whileTap={{ scale: submitting ? 1 : 0.99 }}
          transition={{ duration: 0.2 }}
          className="group relative w-full overflow-hidden rounded-[26px] border border-white/12 bg-white/5 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.32em] text-white shadow-[0_20px_90px_rgba(0,0,0,0.55)] transition disabled:cursor-wait disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/35 via-transparent to-white/10 opacity-70 transition group-hover:opacity-90" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.25),transparent_60%)] opacity-0 transition group-hover:opacity-60" />
          <span className="relative">{buttonLabel}</span>
        </motion.button>
      </form>
    </motion.div>
  );
}

async function ensureSupabaseLogin(email: string, password: string) {
  try {
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.warn("Supabase login failed", error.message);
    }
  } catch (error) {
    console.warn("Unable to sync Supabase session", error);
  }
}
