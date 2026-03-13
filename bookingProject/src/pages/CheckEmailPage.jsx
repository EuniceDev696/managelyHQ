import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "../store/useAuthStore"
import { api } from "../utils/api"
import { getPostAuthRedirect } from "../utils/onboarding"

export default function CheckEmailPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const email = String(location.state?.email || searchParams.get("email") || "").trim()
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const continuePath = getPostAuthRedirect()

  useEffect(() => {
    logout()
  }, [logout])

  const handleVerifyOtp = async () => {
    if (!email) {
      setError("Email address is missing. Go back and enter it again.")
      return
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit verification code from your email.")
      return
    }

    try {
      setVerifying(true)
      setError("")
      setNotice("")
      const response = await api.verifyEmail({ email, otp: otp.trim() })
      if (response?.token && response?.business) {
        sessionStorage.setItem("managelyhqAuthFlow", "register")
        login({ token: response.token, user: response.business })
        setVerified(true)
        setNotice("Your email has been verified. Continue registration to finish setting up your account.")
        return
      }
      setVerified(true)
      setNotice("Your email has been verified. Continue registration to finish setting up your account.")
    } catch (requestError) {
      setError(requestError.message || "Could not verify the code.")
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError("Email address is missing. Go back and enter it again.")
      return
    }

    try {
      setSending(true)
      setError("")
      setNotice("")
      setVerified(false)
      const response = await api.resendVerificationEmail(email)
      setNotice(response.message || "Verification email and OTP sent.")
    } catch (requestError) {
      setError(requestError.message || "Could not resend verification email.")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-xl px-6">
        <div className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Check your email</p>
          <h1 className="mt-3 text-3xl font-semibold">Verify your account</h1>
          <p className="mt-4 text-sm text-ink-800/75 dark:text-pearl-100/75">
            We sent a verification email{email ? ` to ${email}` : ""}. You can open the link or enter the 6-digit OTP below.
          </p>
          <p className="mt-3 text-sm text-ink-800/70 dark:text-pearl-100/70">
            Didn&apos;t get the email? Use the resend button below to send a fresh link and code.
          </p>
          {notice ? <p className="mt-4 text-sm text-emerald-600">{notice}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
          <div className="mt-6">
            <label className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="mt-2 w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-center text-lg tracking-[0.4em] text-ink-900 shadow-soft outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="lux-button-primary inline-flex" onClick={handleVerifyOtp} disabled={verifying || verified}>
              {verifying ? "Verifying..." : verified ? "Verified" : "Verify OTP"}
            </button>
            <button type="button" className="lux-button-primary inline-flex" onClick={handleResend} disabled={sending}>
              {sending ? "Sending..." : "Resend link / OTP"}
            </button>
            {verified ? (
              <button
                type="button"
                className="lux-button-secondary inline-flex"
                onClick={() => navigate(continuePath, { replace: true })}
              >
                Continue registration
              </button>
            ) : null}
            <Link to="/register" className="lux-button-secondary inline-flex">
              Back
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

