import { useState } from "react"
import { motion } from "framer-motion"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip } from "recharts"
import { addMonths, eachDayOfInterval, format, startOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, subDays, subMonths } from "date-fns"
import { useAppStore } from "../../store/useAppStore"
import UpgradeRequiredModal from "../../components/common/UpgradeRequiredModal"
import { formatCurrency } from "../../utils/formatters"
import { isPaidPlan } from "../../utils/plans"

const isSubscriptionPayment = (payment) => payment?.metadata?.purpose === "subscription_upgrade"
const isSameDayKey = (value, key) => String(value || "").slice(0, 10) === key
const formatCategoryLabel = (value) =>
  String(value || "general")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
const hexToRgba = (hex, alpha = 1) => {
  const clean = String(hex || "#18c491").replace("#", "")
  const value = clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean
  const parsed = Number.parseInt(value, 16)
  const red = (parsed >> 16) & 255
  const green = (parsed >> 8) & 255
  const blue = parsed & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export default function AnalyticsPage() {
  const appointments = useAppStore((state) => state.appointments)
  const payments = useAppStore((state) => state.payments)
  const expenses = useAppStore((state) => state.expenses)
  const business = useAppStore((state) => state.business)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const brandColor = business?.brandColor || "#18c491"
  const subscription = business?.subscription || { plan: "free" }
  const paid = isPaidPlan(subscription.plan)
  const [showUpgrade, setShowUpgrade] = useState(!paid)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [activeDetail, setActiveDetail] = useState(null)
  const selectedMonthDate = new Date(`${selectedMonth}-01T00:00:00`)
  const activeBranch = branches.find((branch) => branch.id === selectedBranchId)
  const branchScopeLabel = activeBranch ? `${activeBranch.name} branch` : branches.length ? "All branches" : "Primary business"
  const branchNameById = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const chartColors = [
    brandColor,
    hexToRgba(brandColor, 0.82),
    hexToRgba(brandColor, 0.64),
    hexToRgba(brandColor, 0.46),
    hexToRgba(brandColor, 0.28),
  ]

  if (!paid) {
    return (
      <>
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Analytics</p>
            <h1 className="text-3xl font-semibold">Performance insights</h1>
          </div>
          <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-sm text-ink-700/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
            Analytics is available on Growth and Pro plans.
            <button className="lux-button-primary mt-4" onClick={() => setShowUpgrade(true)}>
              Upgrade now
            </button>
          </div>
        </div>
        <UpgradeRequiredModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    )
  }

  if (appointments.length === 0 && payments.length === 0 && expenses.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Analytics</p>
          <h1 className="text-3xl font-semibold">Performance insights</h1>
        </div>
        <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-sm text-ink-700/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
          Analytics will appear after your first transactions or expenses.
        </div>
      </div>
    )
  }

  const weekStart = startOfWeek(new Date())
  const monthStart = startOfMonth(selectedMonthDate)
  const monthEnd = endOfMonth(selectedMonthDate)
  const confirmedPayments = payments.filter((item) => item.status === "success" && !isSubscriptionPayment(item))
  const subscriptionExpenses = payments.filter((item) => item.status === "success" && isSubscriptionPayment(item))
  const allExpenseItems = [...expenses, ...subscriptionExpenses.map((item) => ({
    ...item,
    title: `Subscription ${item.metadata?.planId || "upgrade"}`,
    category: "subscription",
    spentAt: item.paidAt || item.createdAt,
    notes: item.notes || `Plan upgrade to ${item.metadata?.planId || ""}`.trim(),
  }))]
  const isWithinSelectedMonth = (value) => {
    const date = new Date(value || 0)
    return !isBefore(date, monthStart) && !isAfter(date, monthEnd)
  }
  const todayKey = format(new Date(), "yyyy-MM-dd")
  const weekStartKey = format(weekStart, "yyyy-MM-dd")

  const bookingsWeek = appointments.filter((item) => isAfter(new Date(item.date), weekStart)).length
  const revenueTodayItems = confirmedPayments.filter((item) => isSameDayKey(item.paidAt || item.createdAt, todayKey))
  const expensesTodayItems = allExpenseItems.filter((item) => isSameDayKey(item.spentAt || item.createdAt, todayKey))
  const revenueWeekItems = confirmedPayments.filter((item) => String(item.paidAt || item.createdAt || "").slice(0, 10) >= weekStartKey)
  const expensesWeekItems = allExpenseItems.filter((item) => String(item.spentAt || item.createdAt || "").slice(0, 10) >= weekStartKey)
  const revenueMonth = confirmedPayments
    .filter((item) => isWithinSelectedMonth(item.paidAt || item.createdAt))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expensesMonth =
    allExpenseItems
      .filter((item) => isWithinSelectedMonth(item.spentAt || item.createdAt))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const netRevenueMonth = revenueMonth - expensesMonth
  const revenueToday = revenueTodayItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expensesToday = expensesTodayItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const revenueWeek = revenueWeekItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expensesWeek = expensesWeekItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const popularityMap = appointments.reduce((acc, item) => {
    acc[item.service] = (acc[item.service] || 0) + 1
    return acc
  }, {})
  const popularity = Object.entries(popularityMap).map(([name, value]) => ({ name, value }))
  const mostPopular = popularity.sort((a, b) => b.value - a.value)[0]?.name || "-"

  const bookingTrendMap = appointments.reduce((acc, item) => {
    const key = item.date
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const trendData = Object.entries(bookingTrendMap).slice(-8).map(([name, value]) => ({ name: name.slice(5), value }))

  const revenueMap = confirmedPayments.reduce((acc, item) => {
    const key = String(item.paidAt || item.createdAt || "").slice(0, 10)
    if (!key) return acc
    acc[key] = (acc[key] || 0) + Number(item.amount || 0)
    return acc
  }, {})
  const expenseMap = allExpenseItems.reduce((acc, item) => {
    const key = String(item.spentAt || item.createdAt || "").slice(0, 10)
    if (!key) return acc
    acc[key] = (acc[key] || 0) + Number(item.amount || 0)
    return acc
  }, {})

  const rangeStart = monthStart > subDays(new Date(), 6) ? monthStart : subDays(new Date(), 6)
  const rangeEnd = monthEnd < new Date() ? monthEnd : new Date()
  const financeTrend = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((day) => {
    const key = format(day, "yyyy-MM-dd")
    const revenueValue = Number(revenueMap[key] || 0)
    const expenseValue = Number(expenseMap[key] || 0)
    return {
      name: format(day, "MM-dd"),
      revenue: revenueValue,
      expenses: expenseValue,
      net: revenueValue - expenseValue,
    }
  })

  const peakHour = Array.from({ length: 12 }).map((_, idx) => {
    const hour = `${idx + 8}:00`
    const value = appointments.filter((item) => item.time?.startsWith(String(idx + 8).padStart(2, "0"))).length
    return { hour, value }
  })
  const branchBreakdown = !selectedBranchId
    ? branches
        .map((branch) => {
          const branchId = branch.id
          const revenue = confirmedPayments
            .filter((item) => item.branchId === branchId && isWithinSelectedMonth(item.paidAt || item.createdAt))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
          const branchExpenses = allExpenseItems
            .filter((item) => item.branchId === branchId && isWithinSelectedMonth(item.spentAt || item.createdAt))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
          const bookingCount = appointments.filter((item) => item.branchId === branchId && isWithinSelectedMonth(item.date)).length
          return {
            name: branch.name,
            revenue,
            expenses: branchExpenses,
            bookings: bookingCount,
            net: revenue - branchExpenses,
          }
        })
        .filter((item) => item.revenue > 0 || item.expenses > 0 || item.bookings > 0)
    : []

  const shiftMonth = (direction) => {
    const nextDate = direction === "prev" ? subMonths(selectedMonthDate, 1) : addMonths(selectedMonthDate, 1)
    setSelectedMonth(format(nextDate, "yyyy-MM"))
  }

  const exportCsv = () => {
    const header = ["Date", "Revenue", "Expenses", "Net"]
    const rows = financeTrend.map((item) => [item.name, item.revenue, item.expenses, item.net])
    const csvRows = [header, ...rows]

    if (!selectedBranchId && branchBreakdown.length > 0) {
      csvRows.push([])
      csvRows.push(["Branch", "Revenue", "Expenses", "Bookings", "Net"])
      branchBreakdown.forEach((branch) => {
        csvRows.push([branch.name, branch.revenue, branch.expenses, branch.bookings, branch.net])
      })
    }

    const csv = csvRows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `analytics-${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const financeCards = [
    {
      label: "Revenue today",
      value: revenueToday,
      items: revenueTodayItems.map((item) => ({
        id: item.id,
        title: item.customerName || "Customer payment",
        amount: Number(item.amount || 0),
        date: String(item.paidAt || item.createdAt || "").slice(0, 10),
        description: item.notes || item.reference || "",
        branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
      })),
      tone: "emerald",
    },
    {
      label: "Expenses today",
      value: expensesToday,
      items: expensesTodayItems.map((item) => ({
        id: item.id,
        title: item.title || item.customerName || "Expense",
        amount: Number(item.amount || 0),
        date: String(item.spentAt || item.createdAt || "").slice(0, 10),
        description: item.notes || formatCategoryLabel(item.category) || "",
        branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
      })),
      tone: "rose",
    },
    {
      label: "Revenue this week",
      value: revenueWeek,
      items: revenueWeekItems.map((item) => ({
        id: item.id,
        title: item.customerName || "Customer payment",
        amount: Number(item.amount || 0),
        date: String(item.paidAt || item.createdAt || "").slice(0, 10),
        description: item.notes || item.reference || "",
        branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
      })),
      tone: "emerald",
    },
    {
      label: "Expenses this week",
      value: expensesWeek,
      items: expensesWeekItems.map((item) => ({
        id: item.id,
        title: item.title || item.customerName || "Expense",
        amount: Number(item.amount || 0),
        date: String(item.spentAt || item.createdAt || "").slice(0, 10),
        description: item.notes || formatCategoryLabel(item.category) || "",
        branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
      })),
      tone: "rose",
    },
    {
      label: "Money received in selected month",
      value: revenueMonth,
      items: confirmedPayments
        .filter((item) => isWithinSelectedMonth(item.paidAt || item.createdAt))
        .map((item) => ({
          id: item.id,
          title: item.customerName || "Customer payment",
          amount: Number(item.amount || 0),
          date: String(item.paidAt || item.createdAt || "").slice(0, 10),
          description: item.notes || item.reference || "",
          branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
        })),
      tone: "emerald",
    },
    {
      label: "Money spent in selected month",
      value: expensesMonth,
      items: allExpenseItems
        .filter((item) => isWithinSelectedMonth(item.spentAt || item.createdAt))
        .map((item) => ({
          id: item.id,
          title: item.title || item.customerName || "Expense",
          amount: Number(item.amount || 0),
          date: String(item.spentAt || item.createdAt || "").slice(0, 10),
          description: item.notes || formatCategoryLabel(item.category) || "",
          branchName: item.branchId ? branchNameById[item.branchId] || "Assigned branch" : "All branches",
        })),
      tone: "rose",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Analytics</p>
          <h1 className="text-3xl font-semibold">Performance insights</h1>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            Scope: {branchScopeLabel}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Analysis month</label>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-2 text-sm font-medium text-ink-900 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
              onClick={() => shiftMonth("prev")}
            >
              Prev
            </button>
            <input
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <button
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-2 text-sm font-medium text-ink-900 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
              onClick={() => shiftMonth("next")}
            >
              Next
            </button>
          </div>
          <button className="lux-button-secondary mt-3 w-full" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass-card rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Bookings this week</div>
          <div className="mt-2 text-2xl font-semibold">{bookingsWeek}</div>
        </div>
        {financeCards.map((card) => (
          <button
            key={card.label}
            type="button"
            className="glass-card rounded-3xl p-6 text-left transition hover:scale-[1.01]"
            onClick={() => setActiveDetail(card)}
          >
            <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">{card.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${card.tone === "rose" ? "text-rose-500" : ""}`}>
              {formatCurrency(card.value)}
            </div>
            <div className="mt-2 text-xs text-ink-700/60 dark:text-pearl-100/60">Click to view full details</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass-card rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Net revenue in selected month</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(netRevenueMonth)}</div>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Most popular service</div>
          <div className="mt-2 text-2xl font-semibold">{mostPopular}</div>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Daily finance tracking</div>
          <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">Tracks money received and spent for each day in the visible chart range.</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Money received vs spent</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financeTrend}>
                <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke={brandColor} strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke={hexToRgba(brandColor, 0.5)} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Net movement</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeTrend}>
                <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="net" fill={brandColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {!selectedBranchId && branchBreakdown.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-sm font-semibold">Branch revenue comparison</div>
            <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
              Selected month revenue by branch.
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchBreakdown}>
                  <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="revenue" fill={brandColor} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-sm font-semibold">Branch performance snapshot</div>
            <div className="mt-4 space-y-3">
              {branchBreakdown.map((branch) => (
                <div key={branch.name} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{branch.name}</div>
                    <div className={branch.net < 0 ? "text-rose-500" : "text-emerald-600"}>{formatCurrency(branch.net)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                    <span>{branch.bookings} bookings</span>
                    <span>{formatCurrency(branch.revenue)} revenue</span>
                    <span>{formatCurrency(branch.expenses)} expenses</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Service popularity</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={popularity} dataKey="value" innerRadius={50} outerRadius={90}>
                  {popularity.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Booking trend</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <XAxis dataKey="name" stroke="currentColor" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill={brandColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-sm font-semibold">Peak hours</div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {peakHour.map((slot) => (
            <div
              key={slot.hour}
              className="h-12 rounded-lg bg-white/50 dark:bg-white/5"
              style={
                slot.value > 1
                  ? { backgroundColor: hexToRgba(brandColor, 0.4) }
                  : slot.value === 1
                    ? { backgroundColor: hexToRgba(brandColor, 0.22) }
                    : undefined
              }
              title={`${slot.hour} - ${slot.value}`}
            />
          ))}
        </div>
      </motion.div>

      {activeDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/40 bg-white/95 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{activeDetail.label}</div>
                <div className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
                  Total: {formatCurrency(activeDetail.value)}
                </div>
              </div>
              <button className="lux-button-secondary" onClick={() => setActiveDetail(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {activeDetail.items.length === 0 ? (
                <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                  No records found.
                </div>
              ) : (
                activeDetail.items.map((item) => (
                  <div key={`${activeDetail.label}-${item.id}-${item.date}`} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.title}</div>
                      <div className={activeDetail.tone === "rose" ? "text-rose-500" : "text-emerald-600"}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                      {item.date}
                    </div>
                    {item.branchName ? (
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                        {item.branchName}
                      </div>
                    ) : null}
                    {item.description ? (
                      <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">{item.description}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
