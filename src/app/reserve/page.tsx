"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { PageFooter } from "@/components/design/PageFooter";
import { GlassForm } from "@/components/design/GlassForm";
import { GlassInput } from "@/components/design/GlassInput";
import { GlassTextarea } from "@/components/design/GlassTextarea";
import { GlassButton } from "@/components/design/GlassButton";
import { GlassNav } from "@/components/design/GlassNav";
import { GlassSection } from "@/components/design/GlassSection";
import { RitualTransition } from "@/components/design/RitualTransition";

type ReserveForm = {
  name: string;
  email: string;
  partySize: string;
  visitWindow: string;
  notes: string;
};

const initialForm: ReserveForm = {
  name: "",
  email: "",
  partySize: "",
  visitWindow: "",
  notes: "",
};

export default function ReservePage() {
  const [formData, setFormData] = useState<ReserveForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/reserve/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          partySize: Number.parseInt(formData.partySize, 10),
          visitWindow: formData.visitWindow,
          notes: formData.notes,
        }),
      });

      const payload = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send your request.");
      }

      setSuccessMessage(
        "We received your interest. A member of the team will reach out quietly when seating opens.",
      );
      setFormData(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send your request right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <div
        className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40"
        style={{ maxWidth: "1200px" }}
      >
        {/* Navigation */}
        <nav className="mb-16 sm:mb-20">
          <GlassNav />
        </nav>

        {/* Header */}
        <RitualTransition>
          <PageHeader title="Reserve" subtitle="Reservation Request">
            <p className="max-w-3xl text-sm sm:text-base text-white/60 leading-relaxed">
              The room is still in Prelude. Share your contact details, party size, and the window
              you’re considering. We will reply privately with next steps before seating opens to the
              public.
            </p>
          </PageHeader>
        </RitualTransition>

        {/* Form Section */}
        <GlassSection delay={0.3}>
          <GlassForm onSubmit={handleSubmit}>
            <GlassInput
              label="Your Name"
              type="text"
              autoComplete="name"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              required
            />

            <GlassInput
              label="Contact Email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              required
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GlassInput
                label="Party Size"
                type="number"
                min="1"
                max="20"
                inputMode="numeric"
                value={formData.partySize}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, partySize: event.target.value }))
                }
                required
              />
              <GlassInput
                label="Ideal Window"
                type="text"
                placeholder="e.g. Early Spring 2026 or Private Prelude"
                value={formData.visitWindow}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, visitWindow: event.target.value }))
                }
              />
            </div>

            <GlassTextarea
              label="Occasion or Notes (optional)"
              rows={5}
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Private buyout, guest names, dietary context, or anything else we should know."
            />

            <div className="space-y-4 pt-2">
              {successMessage && (
                <motion.p
                  className="rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-3 text-sm text-white/90"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {successMessage}
                </motion.p>
              )}
              {errorMessage && (
                <motion.p
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errorMessage}
                </motion.p>
              )}

              <GlassButton type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send Request"}
              </GlassButton>
            </div>
          </GlassForm>
        </GlassSection>

        <PageFooter />
      </div>
    </SiteShell>
  );
}
