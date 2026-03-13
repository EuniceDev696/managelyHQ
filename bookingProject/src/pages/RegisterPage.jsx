import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { api } from "../utils/api"
import { setPendingPlan } from "../utils/subscriptionCheckout"
import { setOnboardingCompleted, writeOnboardingData } from "../utils/onboarding"

const initialForm = {
  fullName: "",
  businessName: "",
  email: "",
  password: "",
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateField = (name, value) => {
  const trimmed = value.trim()
  if (name === "fullName") return trimmed ? "" : "Full name is required."
  if (name === "businessName") return trimmed ? "" : "Business name is required."
  if (name === "email") {
    if (!trimmed) return "Email is required."
    return emailRegex.test(trimmed) ? "" : "Enter a valid email address."
  }
  if (name === "password") {
    if (!value) return "Password is required."
    return value.length >= 8 ? "" : "Password must be at least 8 characters."
  }
  return ""
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState("")

  const isValid = useMemo(
    () =>
      ["fullName", "businessName", "email", "password"].every(
        (field) => !validateField(field, form[field]),
      ),
    [form],
  )

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    setSubmitError("")
    setSubmitSuccess("")
  }

  const validateAll = () => {
    const nextErrors = {
      fullName: validateField("fullName", form.fullName),
      businessName: validateField("businessName", form.businessName),
      email: validateField("email", form.email),
      password: validateField("password", form.password),
    }
    setErrors(nextErrors)
    return Object.values(nextErrors).every((error) => !error)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validateAll()) return

    setSubmitting(true)
    setSubmitError("")
    setSubmitSuccess("")
    try {
      setPendingPlan(searchParams.get("plan"))
      const response = await api.register({
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      writeOnboardingData({
        businessName: form.businessName.trim(),
      })
      setOnboardingCompleted(false)
      setSubmitSuccess(response.message || "Account created. Verify your email before signing in.")
      navigate("/check-email", {
        replace: true,
        state: { email: form.email.trim() },
      })
    } catch (error) {
      setSubmitError(error.message || "Registration failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-84px)] items-center justify-center bg-gradient-to-b from-page via-muted/50 to-page px-5 py-14 sm:px-6">
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface p-7 shadow-lg sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-strong">Start managing your business in minutes.</h1>
        <p className="mt-2 text-sm text-body">Create your free account. No credit card required.</p>

        <form className="mt-7 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="fullName" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              onBlur={(event) => setErrors((prev) => ({ ...prev, fullName: validateField("fullName", event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              placeholder="Your full name"
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? <p className="mt-1.5 text-xs text-rose-500">{errors.fullName}</p> : null}
          </div>

          <div>
            <label htmlFor="businessName" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
              Business Name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              value={form.businessName}
              onChange={(event) => setField("businessName", event.target.value)}
              onBlur={(event) => setErrors((prev) => ({ ...prev, businessName: validateField("businessName", event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              placeholder="Your business name"
              aria-invalid={Boolean(errors.businessName)}
            />
            {errors.businessName ? <p className="mt-1.5 text-xs text-rose-500">{errors.businessName}</p> : null}
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              onBlur={(event) => setErrors((prev) => ({ ...prev, email: validateField("email", event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              placeholder="owner@business.com"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <p className="mt-1.5 text-xs text-rose-500">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
                onBlur={(event) => setErrors((prev) => ({ ...prev, password: validateField("password", event.target.value) }))}
                className="w-full rounded-xl border border-border bg-page px-4 py-3 pr-12 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                placeholder="Minimum 8 characters"
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-subdued transition-colors duration-200 hover:text-strong"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? <p className="mt-1.5 text-xs text-rose-500">{errors.password}</p> : null}
          </div>

          {submitError ? <p className="text-sm text-rose-500">{submitError}</p> : null}
          {submitSuccess ? <p className="text-sm text-emerald-600">{submitSuccess}</p> : null}

          <button
            type="submit"
            disabled={submitting || !isValid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                Creating account...
              </>
            ) : (
              "Start Free"
            )}
          </button>

          <p className="text-center text-xs text-subdued">Free plan available. Upgrade anytime.</p>
        </form>

        <p className="mt-6 text-center text-sm text-subdued">
          Already have an account?{" "}
          <Link
            to={`/login${searchParams.get("plan") ? `?plan=${searchParams.get("plan")}` : ""}`}
            className="font-medium text-primary-700 transition-colors duration-200 hover:text-primary-600"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}
