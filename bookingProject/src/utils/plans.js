export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    limits: { services: 3, staff: 2 },
    features: ["Booking calendar", "Public booking page", "Up to 3 services", "Up to 2 staff accounts"],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 25000,
    limits: { services: Infinity, staff: Infinity },
    features: ["Unlimited services", "Unlimited staff", "Team sync", "Analytics dashboard"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 50000,
    limits: { services: Infinity, staff: Infinity },
    features: ["Everything in Growth", "Branch management", "Advanced analytics", "Priority support"],
  },
}

export const isPaidPlan = (planId) => {
  const normalized = String(planId || "").toLowerCase()
  return normalized === "growth" || normalized === "pro"
}
export const canAccessBranchesPlan = (planId) => String(planId || "").toLowerCase() === "pro"

export const getPlan = (planId = "free") => PLANS[planId] || PLANS.free

export const getPlanLimit = (planId, key) => {
  const value = getPlan(planId)?.limits?.[key]
  return value === undefined ? 0 : value
}
