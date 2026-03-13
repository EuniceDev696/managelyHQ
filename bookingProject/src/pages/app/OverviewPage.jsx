import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { isToday } from "date-fns"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { formatCurrency } from "../../utils/formatters"
import { buildPublicBookingUrl } from "../../utils/bookingLinks"
import { api } from "../../utils/api"

const byDay = (appointments) => {
  const map = {}
  appointments.forEach((item) => {
    map[item.date] = (map[item.date] || 0) + 1
  })
  return Object.entries(map).slice(-7).map(([name, value]) => ({ name: name.slice(5), value }))
}

const isSubscriptionPayment = (payment) => payment?.metadata?.purpose === "subscription_upgrade"

export default function OverviewPage() {
  const token = useAuthStore((state) => state.token)
  const business = useAppStore((state) => state.business)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const appointments = useAppStore((state) => state.appointments)
  const payments = useAppStore((state) => state.payments)
  const expenses = useAppStore((state) => state.expenses)
  const services = useAppStore((state) => state.services)
  const staff = useAppStore((state) => state.staff)
  const [copied, setCopied] = useState(false)
  const [notificationActivity, setNotificationActivity] = useState([])
  const [notificationSummary, setNotificationSummary] = useState({ sent: 0, failed: 0 })
  const [notificationLoading, setNotificationLoading] = useState(true)
  const [notificationError, setNotificationError] = useState("")
  const [notificationNotice, setNotificationNotice] = useState("")
  const [resendingPurposeById, setResendingPurposeById] = useState({})
  const activeBranch = branches.find((branch) => branch.id === selectedBranchId) || null
  const branchNameById = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])), [branches])

  const confirmedPayments = payments.filter((item) => item.status === "success" && !isSubscriptionPayment(item))
  const successfulSubscriptionPayments = payments.filter((item) => item.status === "success" && isSubscriptionPayment(item))
  const revenue = confirmedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalExpenses =
    expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) +
    successfulSubscriptionPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expensesToday =
    expenses
    .filter((item) => isToday(new Date(item.spentAt || item.createdAt)))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    +
    successfulSubscriptionPayments
      .filter((item) => isToday(new Date(item.paidAt || item.createdAt)))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const netRevenue = revenue - totalExpenses
  const upcomingToday = appointments.filter((item) => isToday(new Date(item.date))).length

  const serviceCount = appointments.reduce((acc, item) => {
    acc[item.service] = (acc[item.service] || 0) + 1
    return acc
  }, {})
  const mostBookedService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

  const trend = byDay(appointments)
  const revenueTrend = Object.entries(
    confirmedPayments.reduce((acc, item) => {
      const key = String(item.paidAt || item.createdAt || "").slice(0, 10)
      if (!key) return acc
      acc[key] = (acc[key] || 0) + Number(item.amount || 0)
      return acc
    }, {}),
  )
    .slice(-7)
    .map(([name, value]) => ({ name: name.slice(5), value }))
  const authFlow = sessionStorage.getItem("managelyhqAuthFlow") || "login"
  const greeting = useMemo(() => {
    const businessName = (business?.name || "").trim() || "Business"
    return authFlow === "register"
      ? `Welcome, ${businessName}`
      : `Welcome back, ${businessName}`
  }, [authFlow, business?.name])
  const branchScopeLabel = activeBranch ? `${activeBranch.name} branch` : branches.length ? "All branches" : "Primary business"
  const bookingLink = useMemo(() => {
    const base = buildPublicBookingUrl(business)
    if (!base) return ""
    return activeBranch ? `${base}?branchId=${encodeURIComponent(activeBranch.id)}` : base
  }, [activeBranch, business])
  const onboarding = [
    { done: services.length > 0, text: "Add first service" },
    { done: staff.length > 0, text: "Add staff" },
    { done: appointments.length > 0, text: "Share booking link" },
  ]
  const branchSummary = useMemo(
    () =>
      !activeBranch
        ? branches
            .map((branch) => {
              const branchId = branch.id
              const branchRevenue = confirmedPayments
                .filter((item) => item.branchId === branchId)
                .reduce((sum, item) => sum + Number(item.amount || 0), 0)
              const branchExpenses =
                expenses.filter((item) => item.branchId === branchId).reduce((sum, item) => sum + Number(item.amount || 0), 0) +
                successfulSubscriptionPayments.filter((item) => item.branchId === branchId).reduce((sum, item) => sum + Number(item.amount || 0), 0)
              return {
                name: branch.name,
                revenue: branchRevenue,
                bookings: appointments.filter((item) => item.branchId === branchId).length,
                staff: staff.filter((item) => item.branchId === branchId).length,
                services: services.filter((item) => item.branchId === branchId).length,
                net: branchRevenue - branchExpenses,
              }
            })
            .filter((item) => item.revenue > 0 || item.bookings > 0 || item.staff > 0 || item.services > 0)
        : [],
    [activeBranch, appointments, branches, confirmedPayments, expenses, services, staff, successfulSubscriptionPayments],
  )

  useEffect(() => {
    const loadNotificationActivity = async () => {
      if (!token) return
      setNotificationLoading(true)
      setNotificationError("")
      try {
        const next = await api.getNotificationActivity(token, { branchId: selectedBranchId || "", limit: 6 })
        setNotificationActivity(next.items)
        setNotificationSummary(next.summary || { sent: 0, failed: 0 })
      } catch (error) {
        setNotificationError(error.message || "Could not load notification activity.")
      } finally {
        setNotificationLoading(false)
      }
    }

    loadNotificationActivity()
  }, [selectedBranchId, token])

  useEffect(() => {
    if (!notificationNotice) return undefined
    const timer = window.setTimeout(() => setNotificationNotice(""), 4000)
    return () => window.clearTimeout(timer)
  }, [notificationNotice])

  const describeNotification = (item) => {
    const purposeLabels = {
      booking_confirmation: "Confirmation",
      booking_reminder: "Reminder",
      booking_cancellation: "Cancellation",
      booking_reschedule: "Reschedule",
    }
    const statusLabel = item.event === "notifications.email_failed" ? "failed" : "sent"
    const purposeLabel = purposeLabels[item.purpose] || "Email"
    return `${purposeLabel} ${statusLabel}`
  }

  const canResendNotification = (item) =>
    item.event === "notifications.email_failed" &&
    Boolean(item.bookingId) &&
    ["booking_confirmation", "booking_reminder"].includes(String(item.purpose || ""))

  const reloadNotificationActivity = async () => {
    if (!token) return
    setNotificationLoading(true)
    setNotificationError("")
    try {
      const next = await api.getNotificationActivity(token, { branchId: selectedBranchId || "", limit: 6 })
      setNotificationActivity(next.items)
      setNotificationSummary(next.summary || { sent: 0, failed: 0 })
    } catch (error) {
      setNotificationError(error.message || "Could not load notification activity.")
    } finally {
      setNotificationLoading(false)
    }
  }

  const handleResendNotification = async (item) => {
    if (!token || !item?.bookingId || !item?.purpose) return
    const key = `${item.bookingId}:${item.purpose}`
    try {
      setResendingPurposeById((prev) => ({ ...prev, [key]: true }))
      setNotificationError("")
      setNotificationNotice("")
      await api.resendBookingNotification(token, item.bookingId, item.purpose)
      setNotificationNotice("Booking email resent.")
      await reloadNotificationActivity()
    } catch (error) {
      setNotificationError(error.message || "Could not resend booking email.")
    } finally {
      setResendingPurposeById((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const copyBookingLink = async () => {
    if (!bookingLink) return
    try {
      await navigator.clipboard.writeText(bookingLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Overview</p>
        <h1 className="text-3xl font-semibold">{greeting}</h1>
        <p className="text-sm text-ink-700/70 dark:text-pearl-100/70">Business type: {business?.type || "Not set"}</p>
        <p className="text-sm text-ink-700/70 dark:text-pearl-100/70">Scope: {branchScopeLabel}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total bookings", value: appointments.length },
          { label: "Net revenue", value: formatCurrency(netRevenue) },
          { label: "Expenses today", value: formatCurrency(expensesToday) },
          { label: "Active services", value: services.filter((item) => item.active !== false).length },
          { label: "Today", value: upcomingToday },
          { label: "Most booked", value: mostBookedService },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.45 }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">{card.label}</div>
            <div className="mt-3 text-2xl font-semibold">{card.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Share booking link</p>
            <h2 className="mt-1 text-xl font-semibold">Your booking page</h2>
            <p className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
              Send this link to customers so they can book online.
            </p>
          </div>
          <button className="lux-button-primary" onClick={copyBookingLink} disabled={!bookingLink}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/45 bg-white/80 px-4 py-3 text-sm text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/90">
          {bookingLink ? (
            <a href={bookingLink} target="_blank" rel="noreferrer" className="break-all underline-offset-4 hover:underline">
              {bookingLink}
            </a>
          ) : (
            "Booking link will appear after your business slug is ready."
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold">Email delivery activity</div>
            <p className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
              Recent confirmation, reminder, cancellation, and reschedule emails for {branchScopeLabel.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
            <span className="rounded-full border border-emerald-500/30 px-3 py-1 text-emerald-600 dark:text-emerald-300">
              {notificationSummary.sent} sent
            </span>
            <span className="rounded-full border border-rose-500/30 px-3 py-1 text-rose-500">
              {notificationSummary.failed} failed
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {notificationNotice ? (
            <div className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
              {notificationNotice}
            </div>
          ) : null}
          {notificationLoading ? (
            <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
              Loading email activity...
            </div>
          ) : notificationError ? (
            <div className="rounded-2xl border border-rose-500/30 px-4 py-4 text-sm text-rose-500">
              {notificationError}
            </div>
          ) : notificationActivity.length === 0 ? (
            <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
              No email activity recorded for this scope yet.
            </div>
          ) : (
            notificationActivity.map((item) => (
              <div key={item.id || `${item.event}-${item.createdAt}`} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{describeNotification(item)}</div>
                  <div className="flex items-center gap-2">
                    {canResendNotification(item) ? (
                      <button
                        className="rounded-full border border-white/40 px-3 py-1 text-[10px] uppercase tracking-[0.16em]"
                        onClick={() => handleResendNotification(item)}
                        disabled={Boolean(resendingPurposeById[`${item.bookingId}:${item.purpose}`])}
                      >
                        {resendingPurposeById[`${item.bookingId}:${item.purpose}`] ? "Resending..." : "Resend"}
                      </button>
                    ) : null}
                    <div
                      className={`text-xs uppercase tracking-[0.18em] ${
                        item.event === "notifications.email_failed" ? "text-rose-500" : "text-emerald-600 dark:text-emerald-300"
                      }`}
                    >
                      {item.event === "notifications.email_failed" ? "Failed" : "Sent"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                  {item.email ? <span>{item.email}</span> : null}
                  {item.branchId && !activeBranch ? <span>{branchNameById[item.branchId] || "Unknown branch"}</span> : null}
                  {item.reason ? <span>Reason: {item.reason}</span> : null}
                  <span>{new Date(item.createdAt || item.ts || Date.now()).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {onboarding.some((item) => !item.done) && (
        <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-soft dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold">Onboarding checklist</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {onboarding.map((item) => (
              <div key={item.text} className="rounded-2xl border border-white/40 px-4 py-3 text-sm dark:border-white/10">
                <span className={item.done ? "text-emerald-500" : "text-ink-700/70 dark:text-pearl-100/70"}>
                  {item.done ? "Done" : "Pending"}
                </span>
                <div className="mt-1">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeBranch && branchSummary.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-sm font-semibold">Branch revenue comparison</div>
            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchSummary}>
                  <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#18c491" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-sm font-semibold">Branch operating snapshot</div>
            <div className="mt-4 space-y-3">
              {branchSummary.map((branch) => (
                <div key={branch.name} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{branch.name}</div>
                    <div className={branch.net < 0 ? "text-rose-500" : "text-emerald-600"}>{formatCurrency(branch.net)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                    <span>{branch.bookings} bookings</span>
                    <span>{branch.staff} staff</span>
                    <span>{branch.services} services</span>
                    <span>{formatCurrency(branch.revenue)} revenue</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Revenue trend</div>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#18c491" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Booking trend</div>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#2a4cff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

