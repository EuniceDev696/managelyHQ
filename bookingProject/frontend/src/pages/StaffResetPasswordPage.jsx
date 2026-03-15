import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/useAuthStore"
import { api } from "../utils/api"

export default function StaffResetPasswordPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!password || !confirmPassword) {
      setError("Enter your new password in both fields.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      setError("")
      await api.changeStaffPassword(token, password)
      updateUser({ forcePasswordReset: false })
      navigate("/dashboard/overview", { replace: true })
    } catch (submitError) {
      setError(submitError.message || "Could not update password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-xl px-6">
        <motion.div
          className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Security</p>
          <h1 className="mt-3 text-3xl font-semibold">Create your personal password</h1>
          <p className="mt-2 text-sm text-ink-800/70 dark:text-pearl-100/70">
            {user?.name || "Staff"} must change the temporary password before continuing.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <input
              className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm text-ink-900 shadow-soft outline-none dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <input
              className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm text-ink-900 shadow-soft outline-none dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            <button className="lux-button-primary w-full" disabled={loading}>
              {loading ? "Saving..." : "Save new password"}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  )
}
