import { getPendingPlan, getUpgradeRedirectPath } from "./subscriptionCheckout"

export const ONBOARDING_COMPLETED_KEY = "onboarding_completed"
export const ONBOARDING_DATA_KEY = "onboarding_data"

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("luxUser")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const normalizeRole = (role) => String(role || "owner").toLowerCase()

const getOnboardingScope = (user = null) => {
  const activeUser = user || readStoredUser()
  const role = normalizeRole(activeUser?.role)
  const identity = activeUser?.businessId || activeUser?.id || ""
  return {
    role,
    identity,
    requiresOnboarding: role === "owner",
  }
}

const getScopedKey = (baseKey, user = null) => {
  const scope = getOnboardingScope(user)
  if (scope.identity) {
    return `${baseKey}:${scope.identity}`
  }
  return `${baseKey}:pending`
}

const readScopedValue = (baseKey, user = null) => {
  const scopedKey = getScopedKey(baseKey, user)
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue !== null) return scopedValue
  const pendingValue = localStorage.getItem(`${baseKey}:pending`)
  if (pendingValue !== null) return pendingValue
  return localStorage.getItem(baseKey)
}

export const isOnboardingCompleted = (user = null) => {
  const scope = getOnboardingScope(user)
  if (!scope.requiresOnboarding) return true
  const value = readScopedValue(ONBOARDING_COMPLETED_KEY, user)
  if (value === null) return true
  return value === "true"
}

export const setOnboardingCompleted = (completed, user = null) => {
  localStorage.setItem(getScopedKey(ONBOARDING_COMPLETED_KEY, user), completed ? "true" : "false")
}

export const readOnboardingData = (user = null) => {
  try {
    const raw = readScopedValue(ONBOARDING_DATA_KEY, user)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export const writeOnboardingData = (data, user = null) => {
  localStorage.setItem(getScopedKey(ONBOARDING_DATA_KEY, user), JSON.stringify(data || {}))
}

export const getPostAuthRedirect = (user = null) => {
  const activeUser = user || readStoredUser()
  if (activeUser?.forcePasswordReset) return "/staff/reset-password"
  if (!isOnboardingCompleted(activeUser)) return "/onboarding"
  const pendingPlan = getPendingPlan()
  return pendingPlan ? getUpgradeRedirectPath(pendingPlan) : "/dashboard"
}
