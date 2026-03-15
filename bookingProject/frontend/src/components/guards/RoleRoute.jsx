import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../store/useAuthStore"

export default function RoleRoute({ allow = ["owner"], children }) {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role || "owner")) return <Navigate to="/dashboard/overview" replace />
  return children
}

