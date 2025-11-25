"use client";

import { motion } from "framer-motion";
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
      <main className="relative min-h-screen overflow-hidden text-white" style={{ background: "#000000" }}>
        <EnhancedStarfield />
        <div className="relative z-10 mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24" style={{ maxWidth: "1800px" }}>
          {/* Navigation */}
          <motion.nav 
            className="mb-12 sm:mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassNav />
          </motion.nav>

          {/* Hero Section */}
          <section className="mb-24 sm:mb-32 md:mb-40 lg:mb-48">
            <motion.div
              className="text-center mb-12 sm:mb-16 md:mb-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
            >
              <motion.p
                className="mb-4 sm:mb-6 text-xs sm:text-sm uppercase tracking-[0.6em] text-white/50 font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Opening 2026 · St. John's, Newfoundland
              </motion.p>
              
              <motion.h1
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] font-light tracking-[0.15em] text-white mb-6 sm:mb-8 md:mb-10"
                style={{ 
                  fontFamily: "var(--font-eurostile), 'Eurostile', 'Bank Gothic', sans-serif",
                  textShadow: "0 0 60px rgba(255,255,255,0.15), 0 0 120px rgba(255,255,255,0.08), 0 0 180px rgba(255,255,255,0.04)",
                  letterSpacing: "0.2em",
                }}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.6, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
              >
                Snow White Laundry
              </motion.h1>

              <motion.div
                className="max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.7 }}
              >
                <motion.p
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light leading-[1.2] text-white/95 mb-8 sm:mb-10 md:mb-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  An experience shaped with{" "}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                    className="italic text-white"
                  >
                    intention
                  </motion.span>
                  <span className="text-white/50 mx-2">·</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.2 }}
                    className="italic text-white"
                  >
                    emotion
                  </motion.span>
                  <span className="text-white/50 mx-2">·</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.4 }}
                    className="italic text-white"
                  >
                    craft
                  </motion.span>
                </motion.p>
                
                <motion.p
                  className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light text-white/70 max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 1.6 }}
                >
                  Where every course is a story, every moment is designed, and every guest becomes part of our narrative.
                </motion.p>
              </motion.div>
            </motion.div>
          </section>

          {/* Ethos Sections */}
          <div className="space-y-16 sm:space-y-20 md:space-y-24 lg:space-y-32 mb-24 sm:mb-32 md:mb-40">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <GlassSection title="Intention" delay={0}>
                <p className="text-xl sm:text-2xl md:text-3xl text-white/70 leading-relaxed">
                  Every detail is considered. Every moment is designed. We create experiences that honor
                  the craft of hospitality, where each interaction is meaningful and each dish tells a story.
                </p>
              </GlassSection>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <GlassSection title="Emotion" delay={0}>
                <p className="text-xl sm:text-2xl md:text-3xl text-white/70 leading-relaxed">
                  Dining is an emotional journey. We curate spaces, flavors, and moments that resonate
                  deeply—creating memories that linger long after the last course.
                </p>
              </GlassSection>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <GlassSection title="Craft" delay={0}>
                <p className="text-xl sm:text-2xl md:text-3xl text-white/70 leading-relaxed">
                  Mastery in the kitchen, precision in service, artistry in presentation. We honor traditional
                  techniques while embracing innovation, always in pursuit of excellence.
                </p>
              </GlassSection>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            className="text-center space-y-8 sm:space-y-10 md:space-y-12 mb-24 sm:mb-32"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <motion.p
              className="text-lg sm:text-xl md:text-2xl text-white/60 mb-8 sm:mb-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Begin your journey
            </motion.p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <GlassButton href="/prelude" variant="primary">
                  Prelude
                </GlassButton>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <GlassButton href="/reserve" variant="secondary">
                  Reserve
                </GlassButton>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <GlassButton href="/contact" variant="secondary">
                  Contact
                </GlassButton>
              </motion.div>
            </div>
          </motion.div>

          <PageFooter />
        </div>
      </main>
    </>
  );
}

function EnhancedStarfield() {
  const starLayers = [
    {
      size: 320,
      opacity: 0.2,
      duration: 120,
      travel: ["0% 0%", "-40% 25%"],
      glow: "drop-shadow(0 0 10px rgba(255,255,255,0.5))",
    },
    {
      size: 180,
      opacity: 0.25,
      duration: 160,
      travel: ["0% 0%", "55% -35%"],
      glow: "drop-shadow(0 0 12px rgba(248,250,252,0.4))",
    },
    {
      size: 90,
      opacity: 0.3,
      duration: 240,
      travel: ["0% 0%", "-60% -40%"],
      glow: "drop-shadow(0 0 14px rgba(255,255,255,0.35))",
    },
    {
      size: 45,
      opacity: 0.35,
      duration: 300,
      travel: ["0% 0%", "30% 50%"],
      glow: "drop-shadow(0 0 8px rgba(255,255,255,0.4))",
    },
  ];

  const nebulae = [
    {
      position: { top: "-18%", left: "-8%" },
      size: 600,
      from: "rgba(255,255,255,0.25)",
      to: "rgba(5,7,13,0)",
      duration: 45,
      rotate: 6,
    },
    {
      position: { bottom: "-25%", right: "-10%" },
      size: 800,
      from: "rgba(255,255,255,0.18)",
      to: "rgba(2,3,7,0)",
      duration: 60,
      rotate: -4,
    },
    {
      position: { top: "12%", right: "12%" },
      size: 450,
      from: "rgba(255,255,255,0.15)",
      to: "rgba(1,3,8,0)",
      duration: 40,
      rotate: 12,
    },
    {
      position: { top: "50%", left: "5%" },
      size: 380,
      from: "rgba(255,255,255,0.12)",
      to: "rgba(3,5,10,0)",
      duration: 50,
      rotate: -8,
    },
  ];

  const orbitRings = [
    {
      size: "70vw",
      color: "rgba(255,255,255,0.15)",
      opacity: 0.3,
      duration: 180,
    },
    {
      size: "95vw",
      color: "rgba(255,255,255,0.1)",
      opacity: 0.25,
      duration: 250,
    },
    {
      size: "120vw",
      color: "rgba(255,255,255,0.06)",
      opacity: 0.2,
      duration: 320,
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#05070d] to-[#010106]" />
      <motion.div
        className="absolute inset-x-[-15%] top-[-20%] h-[120vh] opacity-30 blur-[180px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.15), transparent 65%)",
        }}
        animate={{ rotate: [0, 8, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-[-10%] bottom-[-15%] h-[100vh] opacity-20 blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.1), transparent 60%)",
        }}
        animate={{ rotate: [0, -6, 0] }}
        transition={{ duration: 80, repeat: Infinity, ease: "easeInOut" }}
      />
      {starLayers.map((layer, index) => (
        <motion.div
          key={`star-layer-${index}`}
          className="absolute inset-0 mix-blend-screen"
          style={{
            opacity: layer.opacity,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.5) 0.7px, transparent 0.7px)",
            backgroundSize: `${layer.size}px ${layer.size}px`,
            filter: layer.glow,
            willChange: "background-position",
          }}
          animate={{ backgroundPosition: layer.travel }}
          transition={{
            duration: layer.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      {nebulae.map((nebula, index) => (
        <motion.div
          key={`nebula-${index}`}
          className="absolute rounded-full blur-[120px]"
          style={{
            ...nebula.position,
            width: nebula.size,
            height: nebula.size,
            background: `radial-gradient(circle, ${nebula.from} 0%, ${nebula.to} 70%)`,
          }}
          animate={{ rotate: nebula.rotate }}
          transition={{
            duration: nebula.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
      {orbitRings.map((ring, index) => (
        <motion.div
          key={`ring-${index}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            width: ring.size,
            height: ring.size,
            borderColor: ring.color,
            opacity: ring.opacity,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: ring.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[320px] bg-gradient-to-t from-black via-[#05070d] to-transparent" />
      <ShootingStars />
      <ConstellationPatterns />
    </div>
  );
}

function ShootingStars() {
  const traces = [
    { top: "15%", left: "8%", angle: -25, distance: 1000, delay: 1.5, duration: 6 },
    { top: "35%", left: "80%", angle: 155, distance: 850, delay: 3.2, duration: 7 },
    { top: "60%", left: "15%", angle: -5, distance: 700, delay: 5.8, duration: 5.5 },
    { top: "80%", left: "70%", angle: 135, distance: 750, delay: 8.5, duration: 6.5 },
    { top: "25%", left: "50%", angle: 45, distance: 900, delay: 11.2, duration: 7.2 },
  ];

  return (
    <>
      {traces.map((trace, index) => {
        const radians = (trace.angle * Math.PI) / 180;
        const dx = Math.cos(radians) * trace.distance;
        const dy = Math.sin(radians) * trace.distance;
        return (
          <motion.span
            key={`shooting-${index}`}
            className="pointer-events-none absolute h-px w-32 origin-left bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-0 mix-blend-screen"
            style={{
              top: trace.top,
              left: trace.left,
              rotate: trace.angle,
            }}
            animate={{
              x: [0, dx],
              y: [0, dy],
              opacity: [0, 0.9, 0],
            }}
            transition={{
              duration: trace.duration,
              delay: trace.delay,
              repeat: Infinity,
              repeatDelay: 6,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}

function ConstellationPatterns() {
  const brightStars = [
    { x: "15%", y: "20%", size: 3, delay: 0 },
    { x: "78%", y: "32%", size: 2.5, delay: 0.3 },
    { x: "48%", y: "67%", size: 2, delay: 0.6 },
    { x: "85%", y: "75%", size: 2.5, delay: 0.9 },
    { x: "25%", y: "60%", size: 2, delay: 1.2 },
    { x: "65%", y: "15%", size: 3, delay: 1.5 },
  ];

  return (
    <>
      {brightStars.map((star, index) => (
        <motion.div
          key={`bright-star-${index}`}
          className="absolute rounded-full bg-white/80"
          style={{
            left: star.x,
            top: star.y,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: "0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)",
            filter: "blur(0.5px)",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0.9, 1],
            scale: [0, 1.3, 1, 1.1],
          }}
          transition={{
            duration: 3,
            delay: star.delay,
            repeat: Infinity,
            repeatDelay: 4,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}
