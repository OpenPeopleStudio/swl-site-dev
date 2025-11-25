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
import { ContactPageSchema } from "@/lib/jsonld-components";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - no actual submission logic yet
    console.log("Contact submitted:", formData);
  };

  return (
    <>
      <ContactPageSchema />
      <SiteShell>
        <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1200px" }}>
          {/* Navigation */}
          <nav className="mb-16 sm:mb-20">
            <GlassNav />
          </nav>

          {/* Header */}
          <RitualTransition>
            <PageHeader
              title="Contact"
              subtitle="Get in Touch"
            />
          </RitualTransition>

          {/* Form Section */}
          <GlassSection delay={0.3}>
            <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-8 sm:mb-10">
              We would love to hear from you. Please use the form below to reach out.
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

              <GlassTextarea
                label="Message"
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />

              <div className="pt-4">
                <GlassButton type="submit" variant="primary">
                  Send Message
                </GlassButton>
              </div>
            </GlassForm>
          </GlassSection>

          <PageFooter />
        </div>
      </SiteShell>
    </>
  );
}
