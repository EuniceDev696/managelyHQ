import FeatureCard from "./FeatureCard"

export default function FeatureGrid({ cards = [] }) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <FeatureCard key={card.title} {...card} index={index} />
      ))}
    </div>
  )
}

