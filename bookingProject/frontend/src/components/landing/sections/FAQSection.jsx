import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Section, SectionHeading } from "../LandingUI"

const faqs = [
  {
    question: "Can my customers book without creating an account?",
    answer: "Yes. Customers can book directly using your custom booking link.",
  },
  {
    question: "Can I change my branding later?",
    answer: "Yes. You can update your logo and brand color anytime.",
  },
  {
    question: "Is this suitable for small businesses?",
    answer: "Absolutely. It works for solo professionals and growing teams.",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <Section id="faq" tone="surface">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 1] }}
      >
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
      </motion.div>
      <div className="mx-auto mt-10 max-w-5xl space-y-3">
        {faqs.map((faq, index) => (
          <Card key={faq.question} className="p-0">
            <button
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-strong"
              onClick={() => setOpenIndex(index === openIndex ? -1 : index)}
            >
              {faq.question}
              <span className="text-primary-600">{openIndex === index ? "-" : "+"}</span>
            </button>
            <AnimatePresence initial={false}>
              {openIndex === index ? (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <p className="px-5 pb-4 text-sm leading-6 text-body">{faq.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Card>
        ))}
      </div>
    </Section>
  )
}

