"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { PageFooter } from "@/components/design/PageFooter";
import { GlassForm } from "@/components/design/GlassForm";
import { GlassInput } from "@/components/design/GlassInput";
import { GlassButton } from "@/components/design/GlassButton";
import { GlassNav } from "@/components/design/GlassNav";
import { GlassSection } from "@/components/design/GlassSection";
import { RitualTransition } from "@/components/design/RitualTransition";

export default function ReservePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    date: "",
    time: "",
    partySize: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - no actual booking logic yet
    console.log("Reservation submitted:", formData);
  };

  return (
    <SiteShell>
      <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1200px" }}>
        {/* Navigation */}
        <nav className="mb-16 sm:mb-20">
          <GlassNav />
        </nav>

        {/* Header */}
        <RitualTransition>
          <PageHeader
            title="Reserve"
            subtitle="Reservation Request"
          />
        </RitualTransition>

        {/* Form Section */}
        <GlassSection delay={0.3}>
          <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-8 sm:mb-10">
            We are not yet accepting reservations. Please provide your information below, and we will
            contact you when booking opens.
          </p>

          <GlassForm onSubmit={handleSubmit}>
            <GlassInput
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <GlassInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <GlassInput
                label="Preferred Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />

              <GlassInput
                label="Preferred Time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            <GlassInput
              label="Party Size"
              type="number"
              min="1"
              value={formData.partySize}
              onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
            />

            <div className="pt-4">
              <GlassButton type="submit" variant="primary">
                Submit Request
              </GlassButton>
            </div>
          </GlassForm>
        </GlassSection>

        <PageFooter />
      </div>
    </SiteShell>
  );
}
