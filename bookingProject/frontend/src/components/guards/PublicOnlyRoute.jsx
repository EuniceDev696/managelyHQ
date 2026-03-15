import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../store/useAuthStore"
import { isAuthenticatedUser } from "../../utils/auth"
import { getPostAuthRedirect } from "../../utils/onboarding"

export default function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  if (isAuthenticatedUser(user, token)) return <Navigate to={getPostAuthRedirect()} replace />
  return children
}

