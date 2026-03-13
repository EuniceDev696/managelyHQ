import { motion } from "framer-motion"
import { Button, Section } from "../LandingUI"

export default function AnimatedCTA() {
  return (
    <Section tone="page">
      <motion.div
        className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-primary-600 via-royal-600 to-ink-900 p-8 text-white shadow-lg sm:p-10"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.78, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <motion.div
          className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/18 blur-3xl"
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-primary-300/30 blur-3xl"
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/78">Final step</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Ready to simplify your bookings?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/82">Create your account today and start managing your business with clarity.</p>
          </div>
          <div className="flex flex-col items-start justify-center gap-3 lg:items-end">
            <Button className="min-w-[168px] bg-white text-strong hover:bg-white/90">Start Free</Button>
          </div>
        </div>
      </motion.div>
    </Section>
  )
}

