import { Section, SectionHeading } from "../LandingUI"

const imageBase = `${import.meta.env.BASE_URL}images/`

const industries = [
  {
    name: "Salon",
    shortLabel: "Salons",
    image: `${imageBase}salon-service.png`,
  },
  {
    name: "Barbershop",
    shortLabel: "Barbers",
    image: `${imageBase}barber-service.png`,
  },
  {
    name: "Spa",
    image: `${imageBase}spa-service.png`,
  },
  {
    name: "Clinic",
    shortLabel: "Clinics",
    image: `${imageBase}clinic-service.png`,
  },
  {
    name: "Gym",
    shortLabel: "Gyms",
    image: `${imageBase}gym-service.png`,
  },
  {
    name: "Fashion designer",
    image: `${imageBase}fashion-service.png`,
  },
  {
    name: "Photography & Videography",
    image: `${imageBase}photo-service.png`,
  },
  {
    name: "Car Wash",
    image: `${imageBase}carwash-hero-main.png`,
  },
  {
    name: "Event Planning",
    image: `${imageBase}event-service.png`,
  },
]

export default function IndustryShowcase() {
  return (
    <Section id="industries" tone="surface">
      <div
        className="section-heading"
      >
        <SectionHeading
          eyebrow="Built for businesses"
          title="Designed for real service teams"
          copy="Whether you run a spa, salon, gym, clinic, barbershop, photography studio, car wash, or event planning business, the platform adapts to how you work."
        />
        <p className="mx-auto max-w-2xl text-xs uppercase tracking-[0.26em] text-subdued">From solo professionals to growing teams.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => (
          <div
            key={industry.name}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="relative h-60">
              <img src={industry.image} alt={industry.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/72 via-ink-950/12 to-transparent" />
            </div>
            <div className="px-4 py-3 text-sm font-semibold text-strong">
              {industry.shortLabel || industry.name}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

