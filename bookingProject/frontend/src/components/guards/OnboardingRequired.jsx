import { Navigate, Outlet } from "react-router-dom"
import AuthRequired from "./AuthRequired"
import { isOnboardingCompleted } from "../../utils/onboarding"
import { useAuthStore } from "../../store/useAuthStore"

export default function OnboardingRequired({ children }) {
  const user = useAuthStore((state) => state.user)
  return (
    <AuthRequired>
      {user?.forcePasswordReset
        ? <Navigate to="/staff/reset-password" replace />
        : isOnboardingCompleted(user) ? children || <Outlet /> : <Navigate to="/onboarding" replace />}
    </AuthRequired>
  )
}

