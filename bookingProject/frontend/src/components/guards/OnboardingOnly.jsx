import { Navigate, Outlet } from "react-router-dom"
import AuthRequired from "./AuthRequired"
import { isOnboardingCompleted } from "../../utils/onboarding"
import { useAuthStore } from "../../store/useAuthStore"

export default function OnboardingOnly({ children }) {
  const user = useAuthStore((state) => state.user)
  return (
    <AuthRequired>
      {user?.forcePasswordReset
        ? <Navigate to="/staff/reset-password" replace />
        : isOnboardingCompleted(user) ? <Navigate to="/dashboard" replace /> : children || <Outlet />}
    </AuthRequired>
  )
}

