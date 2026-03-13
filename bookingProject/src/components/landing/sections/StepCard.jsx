import { motion } from "framer-motion"
import { Card } from "../LandingUI"

const accents = {
  emerald: "from-primary-500/25 via-primary-400/8 to-transparent",
  royal: "from-royal-500/25 via-royal-400/8 to-transparent",
  gold: "from-gold-300/30 via-gold-300/8 to-transparent",
}

export default function StepCard({ index, title, description, accent, bullets = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}
    >
      <Card className="relative min-h-[300px] overflow-hidden p-6">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accents[accent]}`} />
        <div className="relative z-10 flex flex-col gap-3.5">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-subdued">
            <span>Step</span>
            <span>{index}</span>
          </div>
          <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-surface p-3 text-xs uppercase tracking-[0.24em] text-subdued">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
              animate={{ opacity: [0.2, 0.55, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <span>Onboarding scene</span>
              <div className="grid gap-2">
                <div className="rounded-md border border-border bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-body">
                  Business profile
                </div>
                <motion.div
                  className="h-1.5 w-24 rounded-full bg-primary-500/65"
                  style={{ transformOrigin: "left" }}
                  animate={{ scaleX: [0.45, 1, 0.65] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="h-1.5 w-16 rounded-full bg-royal-500/55"
                  style={{ transformOrigin: "left" }}
                  animate={{ scaleX: [0.5, 0.9, 0.7] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
                />
              </div>
            </div>
          </div>
          {bullets.length ? (
            <div className="flex flex-wrap gap-2">
              {bullets.map((item) => (
                <span key={item} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-subdued">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-strong">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-body">{description}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

