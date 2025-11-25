"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { value: "identity", label: "Identity", description: "Who we are" },
  { value: "ethos", label: "Ethos", description: "What we believe" },
  { value: "practice", label: "Practice", description: "How we work" },
  { value: "cuisine", label: "Cuisine", description: "What we cook" },
  { value: "context", label: "Context", description: "Where we are" },
  { value: "hospitality", label: "Hospitality", description: "How we host" },
  { value: "operations", label: "Operations", description: "How we run" },
  { value: "people", label: "People", description: "Who works here" },
] as const;

type Status = "idle" | "generating" | "saving" | "saved" | "error";

export default function BreadcrumbGenerator() {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string>("identity");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setStatus("generating");
    setErrorMessage("");
    setResult("");

    try {
      const res = await fetch("/api/breadcrumbs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data.markdown || "");
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  async function handleSave() {
    if (!result) return;
    setStatus("saving");
    setErrorMessage("");

    try {
      const res = await fetch("/api/breadcrumbs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  const isGenerating = status === "generating";
  const isSaving = status === "saving";
  const isSaved = status === "saved";
  const hasError = status === "error";

  return (
    <div className="glass-surface panel-outline w-full max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-400/70">
          Overshare Engine
        </p>
        <h1 className="mt-2 font-['Eurostile',_sans-serif] text-3xl font-light tracking-wide text-white">
          Breadcrumb Generator
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Capture moments, decisions, philosophies, and systems. Each contribution 
          becomes a structured, AI-ingestible breadcrumb in the Snow White Laundry 
          knowledge archive.
        </p>
      </header>

      <div className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/50">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                  category === cat.value
                    ? "border-cyan-400/60 bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
                }`}
              >
                <span className="block text-sm font-medium">{cat.label}</span>
                <span className="block text-[10px] uppercase tracking-wider text-white/40">
                  {cat.description}
                </span>
                {category === cat.value && (
                  <motion.div
                    layoutId="category-glow"
                    className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/20 to-transparent"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label
            htmlFor="breadcrumb-prompt"
            className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/50"
          >
            Your Contribution
          </label>
          <textarea
            id="breadcrumb-prompt"
            className="h-40 w-full resize-none rounded-2xl border border-white/15 bg-black/40 p-5 text-white placeholder-white/30 transition-all duration-300 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            placeholder="Describe the moment, decision, philosophy, or system you want captured...

Examples:
• Why we chose to open in St. John's
• The philosophy behind our menu pricing
• How we handle difficult service situations
• The story of our signature dish"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="relative w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-6 py-4 text-sm font-medium uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <motion.span
                className="inline-block h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Generating Breadcrumb...
            </span>
          ) : (
            "Generate Breadcrumb"
          )}
        </button>

        {/* Error Message */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Preview */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Generated Breadcrumb Preview
                </h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-wider text-emerald-400">
                  Ready to Save
                </span>
              </div>

              <div className="relative">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/60 p-6 font-mono text-sm leading-relaxed text-white/80">
                  {result}
                </pre>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className={`relative w-full overflow-hidden rounded-2xl border px-6 py-4 text-sm font-medium uppercase tracking-[0.2em] transition-all duration-300 ${
                  isSaved
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                    : "border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]"
                } disabled:cursor-not-allowed`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-3">
                    <motion.span
                      className="inline-block h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Saving to Archive...
                  </span>
                ) : isSaved ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Breadcrumb Saved
                  </span>
                ) : (
                  "Save to Knowledge Archive"
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <footer className="mt-10 border-t border-white/10 pt-6">
        <div className="grid gap-4 text-xs text-white/40 sm:grid-cols-3">
          <div>
            <p className="mb-1 uppercase tracking-wider text-white/60">Archive</p>
            <p>swl-overshare/breadcrumbs/</p>
          </div>
          <div>
            <p className="mb-1 uppercase tracking-wider text-white/60">Engine</p>
            <p>ENGINE_PROMPT.md</p>
          </div>
          <div>
            <p className="mb-1 uppercase tracking-wider text-white/60">Location</p>
            <p>St. John&apos;s, Newfoundland</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

