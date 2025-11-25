"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { GlassForm } from "@/components/design/GlassForm";
import { GlassInput } from "@/components/design/GlassInput";
import { GlassTextarea } from "@/components/design/GlassTextarea";
import { GlassButton } from "@/components/design/GlassButton";
import { GlassCard } from "@/components/design/GlassCard";
import { GlassSection } from "@/components/design/GlassSection";

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
    <SiteShell>
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16" style={{ maxWidth: "1800px" }}>
        <PageHeader
          title="Breadcrumb Creator"
          subtitle="Overshare Engine"
        />

        <GlassSection delay={0.3}>
          <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
            Capture moments, decisions, philosophies, and systems. Each contribution becomes a structured, AI-ingestible breadcrumb in the Snow White Laundry knowledge archive.
          </p>

          <GlassForm>
            {/* Category Selection */}
            <div>
              <label className="mb-3 sm:mb-4 block text-xs uppercase tracking-[0.2em] text-white/40 font-light">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`group relative overflow-hidden rounded-lg border p-4 sm:p-5 text-left transition-all duration-400 ${
                      category === cat.value
                        ? "border-white/30 bg-white/[0.05] text-white/90"
                        : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <span className="block text-sm font-light mb-1">{cat.label}</span>
                    <span className="block text-xs uppercase tracking-wider text-white/30">
                      {cat.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <GlassTextarea
              label="Your Contribution"
              rows={8}
              placeholder="Describe the moment, decision, philosophy, or system you want captured..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            {/* Generate Button */}
            <GlassButton
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              variant="primary"
            >
              {isGenerating ? "Generating..." : "Send to Overshare Engine"}
            </GlassButton>

            {/* Error Message */}
            <AnimatePresence>
              {hasError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-lg border border-white/20 bg-white/[0.05] p-4 text-sm text-white/70"
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
                    <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] text-white/40 font-light">
                      Generated Breadcrumb Preview
                    </h3>
                    <span className="rounded-full border border-white/20 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-wider text-white/60">
                      Ready to Save
                    </span>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/70">
                      {result}
                    </pre>
                  </div>

                  <GlassButton
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isSaved}
                    variant={isSaved ? "secondary" : "primary"}
                  >
                    {isSaving ? "Saving..." : isSaved ? "Saved" : "Save to Archive"}
                  </GlassButton>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassForm>
        </GlassSection>
      </div>
    </SiteShell>
  );
}
