import { motion } from "framer-motion"
import { Section, SectionHeading } from "../LandingUI"

const walkthroughVideo = `${import.meta.env.BASE_URL}videos/walkthrough.mp4`
const walkthroughPoster = `${import.meta.env.BASE_URL}videos/walkthrough-poster.svg`

export default function ProductWalkthrough() {
  return (
    <Section id="walkthrough" tone="surface">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <SectionHeading eyebrow="Demo" title="See how it works" copy="Watch how businesses manage bookings, staff, and payments in just a few clicks." />
      </motion.div>
      <motion.div
        className="relative mt-10 overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-ink-950 via-ink-900 to-primary-600/55 p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.75, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(57,214,166,0.35),_transparent_60%)]" />
        <div className="relative z-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/25 bg-white/5 backdrop-blur-sm">
          <video
            className="h-full w-full object-cover"
            src={walkthroughVideo}
            poster={walkthroughPoster}
            controls
            autoPlay
            muted
            loop
            preload="metadata"
            playsInline
          >
            Your browser does not support video playback.
          </video>
        </div>
      </motion.div>
    </Section>
  )
}

