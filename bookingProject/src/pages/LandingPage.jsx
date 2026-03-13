import { motion } from "framer-motion"
import AnimatedHero from "../components/landing/sections/AnimatedHero"
import FeatureGrid from "../components/landing/sections/FeatureGrid"
import AnimatedStats from "../components/landing/sections/AnimatedStats"
import StepCard from "../components/landing/sections/StepCard"
import IndustryShowcase from "../components/landing/sections/IndustryShowcase"
import AnimatedCTA from "../components/landing/sections/AnimatedCTA"
import TestimonialsSection from "../components/landing/sections/TestimonialsSection"
import PricingSection from "../components/landing/sections/PricingSection"
import ActionCarousel from "../components/landing/sections/ActionCarousel"
import ProductWalkthrough from "../components/landing/sections/ProductWalkthrough"
import SecurityTrust from "../components/landing/sections/SecurityTrust"
import FAQSection from "../components/landing/sections/FAQSection"
import { Section, SectionHeading } from "../components/landing/LandingUI"
import { landingPlatformCards, onboardingSteps } from "../data/landingContent"

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.2, 0.65, 0.3, 1] } },
}

export default function LandingPage() {
  return (
    <main className="relative bg-page dark:bg-ink-950">
      <AnimatedHero />

      <Section id="platform" tone="muted" className="bg-muted/85 dark:bg-ink-900/80">
        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }}>
          <SectionHeading
            eyebrow="One platform"
            title="Everything you need to stay organised and grow"
            copy="Stop juggling WhatsApp messages, paper notes, and spreadsheets. Keep your bookings, team, and payments in one place."
            titleClassName="sm:text-[3.35rem]"
          />
        </motion.div>
        <FeatureGrid cards={landingPlatformCards} />
      </Section>

      <Section id="steps" tone="surface">
        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}>
          <SectionHeading
            eyebrow="Get started"
            title="Get up and running in minutes"
            copy="Set up once, share your booking link, and start receiving appointments."
          />
        </motion.div>

        <div className="relative mt-10 grid gap-6 lg:grid-cols-3">
          <motion.div
            className="pointer-events-none absolute left-1/2 top-14 hidden h-[2px] w-[70%] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-primary-500/60 to-transparent lg:block"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {onboardingSteps.map((step) => (
            <StepCard
              key={step.index}
              index={step.index}
              title={step.title}
              description={step.description}
              accent={step.accent}
              bullets={step.bullets}
            />
          ))}
        </div>
      </Section>

      <Section id="action" tone="muted">
        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }}>
          <SectionHeading
            eyebrow="Product demo"
            title="See bookings in action"
            copy="Know what is happening in your business at all times. Track new appointments, confirm bookings, and monitor your daily schedule without confusion."
          />
        </motion.div>
        <div className="mt-10">
          <ActionCarousel />
        </div>
      </Section>

      <IndustryShowcase />
      <TestimonialsSection />

      <Section
        id="stats"
        tone="contrast"
        className="isolate bg-[radial-gradient(circle_at_top,_#17353a_0%,_#112536_42%,_#0d1a29_100%)] text-white"
      >
        <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }}>
          <SectionHeading
            eyebrow="Impact"
            title="Real impact you can measure"
            copy="Stay organised, reduce missed appointments, and understand your revenue clearly."
            invert
          />
        </motion.div>
        <div className="mt-8">
          <AnimatedStats />
        </div>
      </Section>

      <ProductWalkthrough />
      <SecurityTrust />
      <PricingSection />
      <FAQSection />
      <AnimatedCTA />
    </main>
  )
}
