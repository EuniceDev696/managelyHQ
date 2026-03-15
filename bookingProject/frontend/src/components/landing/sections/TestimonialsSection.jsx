import { motion } from "framer-motion"
import { Section, SectionHeading } from "../LandingUI"

const testimonials = [
  {
    name: "Salon Owner",
    role: "Lagos",
    quote:
      "Before this, we handled bookings through WhatsApp and it was stressful. Now everything is organised and easy to track.",
    avatar: "/images/testimonial-1.png",
  },
  {
    name: "Spa Manager",
    role: "Abuja",
    quote: "Our clients love how simple it is to book online. It makes us look more professional.",
    avatar: "/images/testimonial-2.png",
  },
  {
    name: "Gym Founder",
    role: "Port Harcourt",
    quote: "We now confirm bookings faster and the team always knows the daily schedule.",
    avatar: "/images/testimonial-3.png",
  },
]

export default function TestimonialsSection() {
  return (
    <Section id="testimonials" tone="muted">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <SectionHeading eyebrow="Testimonials" title="Trusted by growing service businesses" />
      </motion.div>
      <div className="mt-10 overflow-hidden">
        <div className="flex min-w-max gap-5 animate-marquee">
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <motion.div
              key={`${testimonial.name}-${index}`}
              className="group relative w-[320px] overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-border bg-muted">
                  <img src={testimonial.avatar} alt={testimonial.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-strong">{testimonial.name}</div>
                  <div className="text-xs uppercase tracking-[0.24em] text-subdued">{testimonial.role}</div>
                </div>
              </div>
              <p className="mt-3.5 text-sm leading-6 text-body">"{testimonial.quote}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

