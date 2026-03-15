import { motion, useInView } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { PLANS } from "../../../utils/plans"
import { formatCurrency } from "../../../utils/formatters"
import { pricingComparisonRows, pricingTiers } from "../../../data/pricingContent"
import { Section, SectionHeading } from "../LandingUI"

function AnimatedNumber({ value, featured = false }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 900
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = progress * (2 - progress)
      setDisplay(Math.round(value * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, value])

  return (
    <span
      ref={ref}
      className={
        featured
          ? "text-[2.8rem] font-semibold leading-none text-strong"
          : "text-[2.3rem] font-semibold leading-none text-strong"
      }
    >
      {formatCurrency(display)}
    </span>
  )
}

function Mark({ yes }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
        yes ? "bg-primary-500/18 text-primary-700" : "bg-muted text-subdued"
      }`}
    >
      {yes ? "+" : "-"}
    </span>
  )
}

export default function PricingSection() {
  return (
    <Section id="pricing" tone="muted">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <SectionHeading eyebrow="Pricing" title="Simple pricing. Clear upgrade path." copy="Start on Free, move to Growth when you need more capacity, and choose Pro when you need advanced control." />
      </motion.div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {pricingTiers.map((tier, index) => {
          const plan = PLANS[tier.id]
          return (
            <motion.div
              key={plan.name}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                tier.featured
                  ? "border-primary-500 bg-gradient-to-b from-primary-500/16 via-surface to-surface shadow-lg ring-2 ring-primary-500/55"
                  : "border-border bg-surface"
              }`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.68, delay: index * 0.08, ease: [0.2, 0.65, 0.3, 1] }}
            >
              {tier.featured ? (
                <span className="inline-flex rounded-full border border-primary-500/35 bg-primary-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-700">
                  Most Popular
                </span>
              ) : null}

              <div className="mt-4 text-2xl font-semibold tracking-tight text-strong">{plan.name}</div>
              <div className="mt-1 text-sm text-subdued">{tier.subtitle}</div>

              <div className="mt-5 flex items-end gap-2">
                {plan.price === 0 ? (
                  <span className="text-[2.3rem] font-semibold leading-none text-strong">Free</span>
                ) : (
                  <>
                    <AnimatedNumber value={plan.price} featured={tier.featured} />
                    <span className="pb-1 text-[10px] uppercase tracking-[0.24em] text-subdued">per month</span>
                  </>
                )}
              </div>

              <ul className="mt-5 grid gap-2.5 text-sm text-body">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        tier.featured ? "bg-primary-600" : "bg-primary-500/80"
                      }`}
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                  tier.id === "free"
                    ? "border-amber-400/35 bg-amber-400/10 text-amber-700"
                    : tier.id === "growth"
                      ? "border-primary-500/45 bg-primary-500/15 text-primary-700"
                      : "border-border bg-muted/40 text-subdued"
                }`}
              >
                {tier.id === "free" ? "For getting started" : tier.id === "growth" ? "For day-to-day operations" : "For scaling operations"}
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.68, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <p className="text-xs uppercase tracking-[0.24em] text-primary-600">How upgrades work</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-subdued">Step 1</p>
            <p className="mt-1 text-sm font-semibold text-strong">Create free account</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-subdued">Step 2</p>
            <p className="mt-1 text-sm font-semibold text-strong">Use Free plan (limited)</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-subdued">Step 3</p>
            <p className="mt-1 text-sm font-semibold text-strong">Upgrade to Growth or Pro</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.68, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <div className="hidden items-center gap-3 border-b border-border pb-3 text-xs uppercase tracking-[0.2em] text-subdued md:grid md:grid-cols-[1.1fr_1fr_1fr_1fr]">
          <div>Plan comparison</div>
          <div className="text-center">Free</div>
          <div className="text-center">Growth</div>
          <div className="text-center">Pro</div>
        </div>

        <div className="mt-3 grid gap-2">
          {pricingComparisonRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3 text-sm md:grid md:grid-cols-[1.1fr_1fr_1fr_1fr] md:items-center md:gap-3 md:py-2.5"
            >
              <span className="font-medium text-strong">{row.label}</span>
              <div className="mt-2 grid gap-2 md:mt-0 md:contents">
                <span className="flex items-center justify-between gap-2 text-body md:justify-center">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-subdued md:hidden">Free</span>
                  <span className="flex items-center gap-2">
                    <Mark yes={row.free !== "No"} />
                    {row.free}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 font-medium text-strong md:justify-center">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-subdued md:hidden">Growth</span>
                  <span className="flex items-center gap-2">
                    <Mark yes={row.growth !== "No"} />
                    {row.growth}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 font-medium text-strong md:justify-center">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-subdued md:hidden">Pro</span>
                  <span className="flex items-center gap-2">
                    <Mark yes={row.pro !== "No"} />
                    {row.pro}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs tracking-[0.14em] text-subdued">Upgrade anytime. No downtime.</div>
      </motion.div>
    </Section>
  )
}
