import { motion } from "framer-motion"
import { Card, Section, SectionHeading } from "../LandingUI"

const trustItems = [
  {
    title: "Secure authentication",
    description: "Protected access keeps your dashboard and business data private.",
  },
  {
    title: "Encrypted storage",
    description: "Sensitive customer and booking details are handled securely.",
  },
  {
    title: "Reliable infrastructure",
    description: "Built with modern systems to keep your business operations stable.",
  },
  {
    title: "Customer data protection",
    description: "Your information and your customers' details stay protected.",
  },
]

export default function SecurityTrust() {
  return (
    <Section id="security" tone="muted">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <SectionHeading
          eyebrow="Security"
          title="Your business data stays secure"
          copy="We use secure authentication and modern infrastructure to protect your information and your customers' details."
        />
      </motion.div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {trustItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.68, delay: index * 0.08, ease: [0.2, 0.65, 0.3, 1] }}
          >
            <Card className="p-5">
              <h3 className="text-lg font-semibold tracking-tight text-strong">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-body">{item.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

