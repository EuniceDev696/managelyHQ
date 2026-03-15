import DashboardLayout from "../../layout/DashboardLayout"
import { useAuthStore } from "../../store/useAuthStore"
import { isAuthenticatedUser } from "../../utils/auth"
import DashboardGuestPage from "../../pages/app/DashboardGuestPage"

export default function DashboardGate() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticatedUser(user, token)) {
    return <DashboardLayout />
  }

  return <DashboardGuestPage />
}

