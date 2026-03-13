import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "../store/useAuthStore"
import { api } from "../utils/api"
import { getPostAuthRedirect } from "../utils/onboarding"

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email") || ""
  const [otp, setOtp] = useState("")
  const [status, setStatus] = useState(token ? "loading" : "error")
  const [message, setMessage] = useState(token ? "Verifying your email..." : "Verification token is missing.")
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const continuePath = getPostAuthRedirect()

  useEffect(() => {
    logout()
  }, [logout])

  useEffect(() => {
    if (!token) {
      return
    }

    api
      .verifyEmail({ token, email })
      .then((response) => {
        if (response?.token && response?.business) {
          sessionStorage.setItem("managelyhqAuthFlow", "register")
          login({ token: response.token, user: response.business })
          setStatus("success")
          setMessage("Your email has been verified. Continue registration to finish setting up your account.")
          return
        }
        setStatus("success")
        setMessage("Your email has been verified. Continue registration to finish setting up your account.")
      })
      .catch((error) => {
        setStatus("error")
        setMessage(error.message || "Verification failed.")
      })
  }, [login, token])

  const handleResend = async () => {
    if (!email) {
      setResendMessage("Email address is missing from this verification link. Go back to login or register and resend from there.")
      return
    }

    try {
      setResending(true)
      setResendMessage("")
      const response = await api.resendVerificationEmail(email)
      setResendMessage(response.message || "Verification email and OTP sent.")
    } catch (error) {
      setResendMessage(error.message || "Could not resend verification email.")
    } finally {
      setResending(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!email) {
      setResendMessage("Email address is missing from this verification link. Go back to login or register and resend from there.")
      return
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setResendMessage("Enter the 6-digit verification code from your email.")
      return
    }

    try {
      setVerifyingOtp(true)
      setResendMessage("")
      const response = await api.verifyEmail({ email, otp: otp.trim() })
      if (response?.token && response?.business) {
        sessionStorage.setItem("managelyhqAuthFlow", "register")
        login({ token: response.token, user: response.business })
        setStatus("success")
        setMessage("Your email has been verified. Continue registration to finish setting up your account.")
        return
      }
      setStatus("success")
      setMessage("Your email has been verified. Continue registration to finish setting up your account.")
    } catch (error) {
      setStatus("error")
      setMessage(error.message || "Verification failed.")
    } finally {
      setVerifyingOtp(false)
    }
  }

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-xl px-6">
        <div className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Email verification</p>
          <h1 className="mt-3 text-3xl font-semibold">Verify your account</h1>
          <p className="mt-4 text-sm text-ink-800/75 dark:text-pearl-100/75">{message}</p>
          {status === "error" ? (
            <p className="mt-3 text-sm text-ink-800/70 dark:text-pearl-100/70">
              If the link expired or never arrived, resend the email or enter the 6-digit OTP instead.
            </p>
          ) : null}
          {resendMessage ? <p className="mt-4 text-sm text-emerald-600">{resendMessage}</p> : null}
          {status !== "loading" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {status === "error" ? (
                <>
                  <div className="w-full">
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
                  <button type="button" className="lux-button-primary inline-flex" onClick={handleVerifyOtp} disabled={verifyingOtp}>
                    {verifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button type="button" className="lux-button-secondary inline-flex" onClick={handleResend} disabled={resending}>
                    {resending ? "Sending..." : "Resend link / OTP"}
                  </button>
                </>
              ) : null}
              {status === "success" ? (
                <button
                  type="button"
                  className="lux-button-primary inline-flex"
                  onClick={() => navigate(continuePath, { replace: true })}
                >
                  Continue registration
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

