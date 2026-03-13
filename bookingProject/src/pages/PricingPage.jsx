import { motion } from "framer-motion"
import PricingSection from "../components/landing/sections/PricingSection"
import AnimatedCTA from "../components/landing/sections/AnimatedCTA"

export default function PricingPage() {
  return (
    <main className="relative">
      <section className="relative py-24 sm:py-28">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <motion.p
            className="text-xs uppercase tracking-[0.4em] text-emerald-500"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
          >
            Pricing
          </motion.p>
          <motion.h1
            className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 0.65, 0.3, 1] }}
          >
            Start free. Upgrade when you need more control.
          </motion.h1>
          <motion.p
            className="mt-6 text-sm text-ink-800/70 dark:text-pearl-100/70"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.65, 0.3, 1] }}
          >
            Free helps you get started, Growth removes the daily limits, and Pro is built for advanced teams and multi-location businesses.
          </motion.p>
        </div>
      </section>
      <PricingSection />
      <AnimatedCTA />
    </main>
  )
}

