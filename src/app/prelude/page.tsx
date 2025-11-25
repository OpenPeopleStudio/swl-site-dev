"use client";

import { motion } from "framer-motion";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { PageFooter } from "@/components/design/PageFooter";
import { GlassSection } from "@/components/design/GlassSection";
import { GlassNav } from "@/components/design/GlassNav";
import { GlassButton } from "@/components/design/GlassButton";
import { RitualTransition } from "@/components/design/RitualTransition";
import Link from "next/link";

export default function PreludePage() {
  return (
    <SiteShell>
      <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1600px" }}>
        {/* Navigation */}
        <nav className="mb-16 sm:mb-20">
          <GlassNav />
        </nav>

        {/* Header */}
        <RitualTransition>
          <PageHeader
            title="Prelude"
            subtitle="Philosophy"
          />
        </RitualTransition>

        {/* Philosophy Sections */}
        <div className="space-y-20 sm:space-y-24 md:space-y-32 lg:space-y-40 mb-32 sm:mb-40 md:mb-48">
          <GlassSection title="The Restaurant's Philosophy" delay={0.3}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-6">
              Snow White Laundry is more than a restaurant. It is a space where intention meets emotion,
              where craft meets care, where every detail serves a purpose beyond the immediate.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
              We believe in the power of hospitality to transform moments into memories, to create
              connections that extend beyond the table, to honor the ingredients, the place, and the people
              who make it all possible.
            </p>
          </GlassSection>

          <GlassSection title="Newfoundland Context" delay={0.4}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-6">
              St. John’s, Newfoundland, is a place of rugged beauty, resilient communities, and deep
              traditions. Here, the ocean meets the land with force and grace, shaping both the landscape
              and the culture.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
              Our restaurant draws inspiration from this place—its history, its people, its natural
              abundance. We honor local ingredients, support local producers, and create a space that
              reflects the character of Newfoundland while bringing something new to the table.
            </p>
          </GlassSection>

          <GlassSection title="Design Ethos" delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-6">
              Our design philosophy mirrors our culinary approach: monochrome, minimal, meaningful.
              Every surface, every light, every texture is chosen with intention.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
              We create spaces that invite reflection, that allow the food and the experience to take
              center stage. Nothing is superfluous. Everything serves a purpose. This is our craft.
            </p>
          </GlassSection>

          <GlassSection title="A Welcoming Message" delay={0.6}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed">
              We are building something special here. Something that honors tradition while embracing
              innovation. Something that feels both familiar and entirely new.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mt-6">
              Opening in 2026. Until then, we invite you to explore our philosophy, to understand our
              approach, and to join us on this journey.
            </p>
          </GlassSection>
        </div>

        {/* Link to Overshare */}
        <motion.div
          className="text-center mb-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Link
            href="/overshare"
            className="text-sm sm:text-base text-white/40 hover:text-white/60 transition-colors uppercase tracking-[0.2em]"
          >
            Explore Overshare →
          </Link>
        </motion.div>

        <PageFooter />
      </div>
    </SiteShell>
  );
}
