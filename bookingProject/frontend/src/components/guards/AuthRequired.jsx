import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "../../store/useAuthStore"
import { isAuthenticatedUser } from "../../utils/auth"

export default function AuthRequired({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticatedUser(user, token)) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children || <Outlet />
}

