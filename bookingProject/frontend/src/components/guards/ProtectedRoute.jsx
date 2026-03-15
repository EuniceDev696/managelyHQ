import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../store/useAuthStore"
import { isAuthenticatedUser } from "../../utils/auth"

export default function ProtectedRoute({ children, redirectTo = "/login" }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticatedUser(user, token)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return children
}

