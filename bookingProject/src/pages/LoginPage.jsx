import { useState } from "react"
import { motion } from "framer-motion"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "../store/useAuthStore"
import { api } from "../utils/api"
import { getPostAuthRedirect } from "../utils/onboarding"
import { setPendingPlan } from "../utils/subscriptionCheckout"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const [loginMode, setLoginMode] = useState("owner")
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const needsVerification = error?.toLowerCase().includes("verify your email")
  const nextFromState = location.state?.from?.pathname

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setError("Please enter your email and password.")
      return
    }
    setError("")
    try {
      setSubmitting(true)
      setPendingPlan(searchParams.get("plan"))
      const response = await api.login(form)
      sessionStorage.setItem("managelyhqAuthFlow", "login")
      login({ token: response.token, user: response.business })
      const defaultPath = getPostAuthRedirect(response.business)
      const nextPath =
        response.business?.forcePasswordReset || !nextFromState || nextFromState === "/login"
          ? defaultPath
          : nextFromState
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.message || "Login failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-xl px-6">
        <motion.div
          className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 1] }}
        >
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Welcome</p>
          <div className="mt-3 flex items-center gap-3">
            <img src="/managelyhq-logo.svg" alt="ManagelyHQ logo" className="h-8 w-8 rounded-lg" />
            <h1 className="text-3xl font-semibold">Sign in to ManagelyHQ</h1>
          </div>
          <p className="mt-2 text-sm text-ink-800/70 dark:text-pearl-100/70">
            Choose how you want to sign in.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                loginMode === "owner"
                  ? "border-emerald-500 bg-emerald-500/10 text-ink-900 dark:text-pearl-100"
                  : "border-white/40 bg-white/70 text-ink-800/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70"
              }`}
              onClick={() => setLoginMode("owner")}
            >
              <div className="font-semibold">Log in as owner</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                Business account
              </div>
            </button>
            <button
              type="button"
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                loginMode === "staff"
                  ? "border-emerald-500 bg-emerald-500/10 text-ink-900 dark:text-pearl-100"
                  : "border-white/40 bg-white/70 text-ink-800/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70"
              }`}
              onClick={() => setLoginMode("staff")}
            >
              <div className="font-semibold">Log in as staff</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                Team access
              </div>
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm text-ink-800/75 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/75">
            <div className="font-medium">{loginMode === "owner" ? "Owner sign-in" : "Staff sign-in"}</div>
            <div className="mt-1">
              {loginMode === "owner"
                ? "Use your business owner email and password to access the main dashboard."
                : "Use the staff email and password assigned to you by the business owner or admin."}
            </div>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm text-ink-900 shadow-soft outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder={loginMode === "owner" ? "owner@business.com" : "staff@business.com"}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                Password
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm text-ink-900 shadow-soft outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="********"
              />
            </div>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            {needsVerification ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-ink-800/75 dark:text-pearl-100/75">
                Email confirmation is part of registration only. Finish verification from the check-email page, then come back here to sign in.
                <div className="mt-3">
                  <Link
                    to={`/check-email?email=${encodeURIComponent(form.email.trim())}`}
                    className="text-emerald-500 underline"
                  >
                    Go to email confirmation
                  </Link>
                </div>
              </div>
            ) : null}
            <button className="lux-button-primary w-full" disabled={submitting}>
              {submitting ? "Signing in..." : loginMode === "owner" ? "Log in as owner" : "Log in as staff"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
            <span>Secure login</span>
            <Link to={`/register${searchParams.get("plan") ? `?plan=${searchParams.get("plan")}` : ""}`} className="hover:text-emerald-500">
              Create account
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  )
}


