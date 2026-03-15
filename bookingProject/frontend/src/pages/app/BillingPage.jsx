import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useLocation } from "react-router-dom"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"
import { PLANS, getPlan, isPaidPlan } from "../../utils/plans"
import { clearPendingPlan, setPendingPlan } from "../../utils/subscriptionCheckout"

export default function BillingPage() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const business = useAppStore((state) => state.business)
  const setBusiness = useAppStore((state) => state.setBusiness)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [processingPlanId, setProcessingPlanId] = useState("")

  const subscription = business?.subscription || { plan: "free", status: "active" }
  const currentPlan = getPlan(subscription.plan)
  const serviceLimit = currentPlan.limits?.services
  const staffLimit = currentPlan.limits?.staff
  const planList = useMemo(() => Object.values(PLANS), [])

  useEffect(() => {
    const run = async () => {
      if (!token) return
      const params = new URLSearchParams(location.search)
      const reference = params.get("reference") || params.get("trxref") || params.get("payment_ref")
      if (!reference) return

      try {
        setError("")
        setNotice("")
        await api.verifySubscriptionPayment(token, reference)
        clearPendingPlan()
        const refreshed = await api.getBusinessMe(token)
        setBusiness(refreshed)
        setNotice("Subscription payment verified and plan activated.")
      } catch (err) {
        setError(err.message || "Could not verify subscription payment.")
      }
    }
    run()
  }, [location.search, token, setBusiness])

  const startUpgrade = async (plan) => {
    if (!token || !business?.email || !isPaidPlan(plan.id) || subscription.plan === plan.id) return

    try {
      setProcessingPlanId(plan.id)
      setError("")
      setNotice("")
      setPendingPlan(plan.id)
      const payment = await api.initializeSubscriptionPayment(token, {
        email: business.email,
        amount: plan.price,
        currency: "NGN",
        planId: plan.id,
        callbackUrl: `${window.location.origin}/dashboard/billing`,
      })

      if (!payment?.authorizationUrl) {
        throw new Error("Payment link was not returned.")
      }

      window.location.href = payment.authorizationUrl
    } catch (err) {
      setError(err.message || "Could not start upgrade checkout.")
      setProcessingPlanId("")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Billing</p>
        <h1 className="text-3xl font-semibold">Subscription and billing</h1>
        {notice ? <p className="mt-2 text-sm text-emerald-600">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Current plan</div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold">{currentPlan.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                Status: {subscription.status || "active"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Renewal</div>
              <div className="text-sm">{subscription.renewalDate || "N/A"}</div>
            </div>
          </div>
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Plan comparison</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Services</span>
              <span>{Number.isFinite(serviceLimit) ? `Up to ${serviceLimit}` : "Unlimited"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Staff accounts</span>
              <span>{Number.isFinite(staffLimit) ? `Up to ${staffLimit}` : "Unlimited"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Analytics</span>
              <span>{isPaidPlan(subscription.plan) ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Branding customization</span>
              <span>Yes</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {planList.map((plan) => (
          <motion.div
            key={plan.id}
            className={`rounded-3xl border border-white/50 bg-white/70 p-6 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${subscription.plan === plan.id ? "ring-2 ring-emerald-500/40" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm font-semibold">{plan.name}</div>
            <div className="mt-2 text-2xl font-semibold">
              {plan.price === 0 ? "Free" : `NGN ${plan.price.toLocaleString()}/mo`}
            </div>
            <ul className="mt-4 space-y-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {subscription.plan === plan.id ? (
              <div className="mt-6 rounded-full border border-white/40 px-4 py-2 text-center text-xs uppercase tracking-[0.2em] text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                Current plan
              </div>
            ) : plan.id === "free" ? (
              <div className="mt-6 rounded-full border border-white/40 px-4 py-2 text-center text-xs uppercase tracking-[0.2em] text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                Free plan
              </div>
            ) : (
              <button
                type="button"
                className="lux-button-primary mt-6 w-full"
                onClick={() => startUpgrade(plan)}
                disabled={processingPlanId === plan.id}
              >
                {processingPlanId === plan.id ? "Redirecting..." : `Upgrade to ${plan.name}`}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/50 bg-white/70 p-6 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/60">
        Choose a paid plan to start checkout. After payment, this page verifies the transaction and activates the plan.
      </div>
    </div>
  )
}
