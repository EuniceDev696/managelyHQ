const PENDING_PLAN_KEY = "managelyhq_pending_plan"

const PAID_PLANS = new Set(["growth", "pro"])

export const normalizePendingPlan = (planId) => {
  const normalized = String(planId || "").trim().toLowerCase()
  return PAID_PLANS.has(normalized) ? normalized : ""
}

export const setPendingPlan = (planId) => {
  const normalized = normalizePendingPlan(planId)
  if (!normalized) {
    sessionStorage.removeItem(PENDING_PLAN_KEY)
    return ""
  }
  sessionStorage.setItem(PENDING_PLAN_KEY, normalized)
  return normalized
}

export const getPendingPlan = () => normalizePendingPlan(sessionStorage.getItem(PENDING_PLAN_KEY))

export const clearPendingPlan = () => {
  sessionStorage.removeItem(PENDING_PLAN_KEY)
}

export const getUpgradeRedirectPath = (planId) => {
  const normalized = normalizePendingPlan(planId)
  return normalized ? `/dashboard/billing?plan=${normalized}` : "/dashboard"
}

