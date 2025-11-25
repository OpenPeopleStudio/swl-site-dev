"use client";

import { motion } from "framer-motion";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { PageFooter } from "@/components/design/PageFooter";
import { GlassButton } from "@/components/design/GlassButton";
import { GlassSection } from "@/components/design/GlassSection";
import { GlassNav } from "@/components/design/GlassNav";
import { RitualTransition } from "@/components/design/RitualTransition";
import { RestaurantSchema } from "@/lib/jsonld-components";

export default function Landing() {
  return (
    <>
      <RestaurantSchema />
      <SiteShell>
        <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1600px" }}>
          {/* Navigation */}
          <nav className="mb-16 sm:mb-20">
            <GlassNav />
          </nav>

          {/* Header */}
          <RitualTransition>
            <PageHeader
              title="Snow White Laundry"
              subtitle="Opening 2026 · St. John's, Newfoundland"
            />
          </RitualTransition>

          {/* Intro */}
          <motion.p
            className="max-w-3xl text-xl sm:text-2xl md:text-3xl leading-relaxed text-white/70 mb-16 sm:mb-20 md:mb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            An experience shaped with intention, emotion, and craft.
          </motion.p>

          {/* Ethos Sections */}
          <div className="space-y-20 sm:space-y-24 md:space-y-32 lg:space-y-40 mb-32 sm:mb-40 md:mb-48 lg:mb-56">
            <GlassSection title="Intention" delay={0.5}>
              <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
                Every detail is considered. Every moment is designed. We create experiences that honor
                the craft of hospitality, where each interaction is meaningful and each dish tells a story.
              </p>
            </GlassSection>

            <GlassSection title="Emotion" delay={0.6}>
              <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
                Dining is an emotional journey. We curate spaces, flavors, and moments that resonate
                deeply—creating memories that linger long after the last course.
              </p>
            </GlassSection>

            <GlassSection title="Craft" delay={0.7}>
              <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
                Mastery in the kitchen, precision in service, artistry in presentation. We honor traditional
                techniques while embracing innovation, always in pursuit of excellence.
              </p>
            </GlassSection>
          </div>

          {/* CTA Section */}
          <motion.div
            className="text-center space-y-8 sm:space-y-10 md:space-y-12 mb-32 sm:mb-40"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 justify-center">
              <GlassButton href="/prelude" variant="primary">
                Prelude
              </GlassButton>
              <GlassButton href="/reserve" variant="secondary">
                Reserve
              </GlassButton>
              <GlassButton href="/contact" variant="secondary">
                Contact
              </GlassButton>
            </div>
          </motion.div>

          <PageFooter />
        </div>
      </SiteShell>
    </>
  );
}
