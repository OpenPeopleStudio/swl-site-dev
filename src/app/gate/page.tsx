"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type Mode = "email" | "password";

export function LoginPanel() {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheckEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) {
      toast.error("Please enter an email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Failed to check account.");
      }

      const { exists } = await res.json();
      setUserExists(exists);
      setMode("password"); // move to password stage and STAY there
    } catch (err: any) {
      console.error("check-user error:", err);
      toast.error(err?.message ?? "Unable to verify account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      if (userExists) {
        // login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back.");
      } else {
        // sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Check your email to confirm.");
      }
    } catch (err: any) {
      console.error("auth error:", err);
      toast.error(err?.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  const title = userExists === null
    ? "Welcome"
    : userExists
    ? "Welcome Back"
    : "Welcome";

  const buttonLabel =
    mode === "email" ? "Next" : userExists ? "Enter" : "Create Account";

  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.12, 0.9, 0.39, 1.0] }}
      className="glass-panel w-[420px] max-w-[90vw] p-8 text-gray-100 space-y-6"
    >
      {/* Title */}
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-light tracking-[0.35em] text-center uppercase"
      >
        {title}
      </motion.h1>

      {/* Subtitle */}
      <p className="text-xs text-center text-white/40">
        Snow White Laundry · CortexOS
      </p>

      {/* Form */}
      <form
        onSubmit={mode === "email" ? handleCheckEmail : handleSubmit}
        className="space-y-4"
      >
        {/* Email always visible */}
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.2em] text-white/40">
            Email
          </label>
          <input
            type="email"
            required
            autoFocus={mode === "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-white/10 focus:border-white/60 py-2 text-sm outline-none transition"
            placeholder="you@example.com"
          />
        </div>

        {/* Password only in password mode */}
        <AnimatePresence>
          {mode === "password" && (
            <motion.div
              key="password-field"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5 }}
              className="space-y-1"
            >
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 focus:border-white/60 py-2 text-sm outline-none transition"
                placeholder={userExists ? "Enter your password" : "Create a password"}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary button */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="mt-4 w-full py-2 rounded-lg border border-white/15 text-sm text-white/80 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
        >
          {loading ? "Working..." : buttonLabel}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default LoginPanel;