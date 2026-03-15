import { motion, useInView } from "framer-motion"
import { useEffect, useRef, useState } from "react"

const stats = [
  { label: "Appointments processed", value: 1.8, suffix: "M", featured: true },
  { label: "Reduction in no-shows", value: 38, suffix: "%" },
  { label: "Faster booking", value: 82, suffix: "%" },
  { label: "Premium brands", value: 120, suffix: "+" },
]

function CountUp({ value, suffix, featured = false }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.35 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 900
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = progress * (2 - progress)
      setDisplay(value * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, value])

  const formatted = value < 2 ? display.toFixed(1) : Math.round(display).toLocaleString("en-US")
  return (
    <span ref={ref} className={featured ? "text-[3rem] font-bold leading-none text-white sm:text-[3.25rem]" : "text-[2.4rem] font-semibold leading-none text-white sm:text-[2.7rem]"}>
      {formatted}
      {suffix}
    </span>
  )
}

export default function AnimatedStats() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.11] via-white/[0.07] to-white/[0.04] p-5 shadow-[0_22px_45px_-28px_rgba(2,8,20,0.95)] backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-26px_rgba(2,8,20,0.98)] ${
            stat.featured ? "md:col-span-2 lg:col-span-2" : ""
          }`}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.68, delay: index * 0.08, ease: [0.2, 0.65, 0.3, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/12" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/0 via-primary-400/80 to-primary-500/0" />
          <CountUp value={stat.value} suffix={stat.suffix} featured={stat.featured} />
          <div className={`mt-2 uppercase text-white ${stat.featured ? "text-sm tracking-[0.08em]" : "text-xs tracking-[0.1em]"}`}>{stat.label}</div>
        </motion.div>
      ))}
    </div>
  )
}

