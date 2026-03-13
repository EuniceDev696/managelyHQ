import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "../LandingUI"

const imageBase = `${import.meta.env.BASE_URL}images/`

const heroSlides = [
  {
    title: "Luxury salon interior",
    url: `${imageBase}salon-hero-main.png`,
  },
  {
    title: "Modern barbershop",
    url: `${imageBase}barber-hero-main.png`,
  },
  {
    title: "Relaxing spa",
    url: `${imageBase}spa-hero-main.png`,
  },
  {
    title: "Premium clinic",
    url: `${imageBase}clinic-hero-main.png`,
  },
  {
    title: "Fashion studio",
    url: `${imageBase}fashion-hero-main.png`,
  },
  {
    title: "Photography studio",
    url: `${imageBase}photo-hero-main.png`,
  },
  {
    title: "Car wash service",
    url: `${imageBase}carwash-hero-main.png`,
  },
  {
    title: "Event planning",
    url: `${imageBase}event-hero-main.png`,
  },
  {
    title: "Auto care workshop",
    url: `${imageBase}mech-hero-main.png`,
  },
]

export default function AnimatedHero() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length)
    }, 3500)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <section className="relative overflow-hidden bg-page pb-16 pt-12 dark:bg-ink-950 sm:pb-20 sm:pt-16">
      <div className="section-container grid items-center gap-10 lg:grid-cols-[1fr_1.02fr] lg:gap-14">
        <div>
          <motion.p
            className="text-xs uppercase tracking-[0.36em] text-primary-600"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.2, 0.65, 0.3, 1] }}
          >
            ManagelyHQ
          </motion.p>
          <motion.h1
            className="mt-4 text-4xl font-bold leading-[1.08] tracking-[0.01em] text-strong sm:text-6xl lg:text-[4.1rem]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.05, ease: [0.2, 0.65, 0.3, 1] }}
          >
            Simplify Operations. Increase Bookings. Grow Faster.
          </motion.h1>
          <motion.p
            className="mt-5 max-w-xl text-base leading-7 text-body"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.12, ease: [0.2, 0.65, 0.3, 1] }}
          >
            ManagelyHQ helps you manage appointments, staff, customers, and payments
            - all from one intelligent platform.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.2, ease: [0.2, 0.65, 0.3, 1] }}
          >
            <Button as="a" href="/register" className="w-full sm:min-w-[168px] sm:w-auto">
              Start Free
            </Button>
            <Button as="a" href="/pricing" variant="secondary" className="w-full sm:min-w-[168px] sm:w-auto">
              Explore Plans
            </Button>
          </motion.div>
          <motion.div
            className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium tracking-[0.14em] text-subdued sm:mt-3 sm:tracking-[0.18em]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.24, ease: [0.2, 0.65, 0.3, 1] }}
          >
            <span>No card required. Designed for ambitious service businesses ready to scale.</span>
          </motion.div>
          <motion.p
            className="mt-8 max-w-3xl text-sm font-semibold leading-6 text-strong sm:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.28, ease: [0.2, 0.65, 0.3, 1] }}
          >
            Perfect for salons, spas, gyms, barbershops, clinics, makeup artists, photography and videography, car wash, event planning, and many other service businesses.
          </motion.p>
        </div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.16, ease: [0.2, 0.65, 0.3, 1] }}
        >
          <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary-500/20 via-transparent to-royal-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 left-10 right-10 h-10 rounded-full bg-ink-950/20 blur-xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-lg">
            <motion.div className="relative h-[420px] w-full sm:h-[500px]" animate={{ y: [0, -4, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroSlides[activeSlide].url}
                  className="absolute inset-0"
                  initial={{ opacity: 0.15, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.85, ease: "easeInOut" }}
                >
                  <img src={heroSlides[activeSlide].url} alt={heroSlides[activeSlide].title} className="h-full w-full object-cover" loading="eager" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/5 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/35 bg-white/82 p-4 text-[11px] uppercase tracking-[0.14em] text-strong shadow-sm backdrop-blur sm:text-xs sm:tracking-[0.24em]">
                Curated experiences across every touchpoint
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}


