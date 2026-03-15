import { useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Sparkles,
  Users,
  UserCircle,
  CreditCard,
  Building2,
  BarChart3,
  Settings,
  Wallet,
  Menu,
  Bell,
} from "lucide-react"
import DarkModeToggle from "../components/common/DarkModeToggle"
import PageTransition from "../components/common/PageTransition"
import { useAppStore } from "../store/useAppStore"
import { useAuthStore } from "../store/useAuthStore"
import { api } from "../utils/api"
import { isOnboardingCompleted } from "../utils/onboarding"
import { canAccessBranchesPlan } from "../utils/plans"

const baseNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard/overview" },
  { label: "Calendar", icon: CalendarDays, path: "/dashboard/calendar" },
  { label: "Appointments", icon: ClipboardList, path: "/dashboard/appointments" },
  { label: "Services", icon: Sparkles, path: "/dashboard/services" },
  { label: "Staff", icon: Users, path: "/dashboard/staff" },
  { label: "Customers", icon: UserCircle, path: "/dashboard/customers" },
  { label: "Payments", icon: CreditCard, path: "/dashboard/payments" },
]

const ownerOnlyItems = [
  { label: "Branches", icon: Building2, path: "/dashboard/branches" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
  { label: "Billing", icon: Wallet, path: "/dashboard/billing" },
]

const canManageStaff = (role) => ["owner", "admin", "manager"].includes(String(role || "").toLowerCase())
const canViewServices = (role) => ["owner", "admin", "manager"].includes(String(role || "").toLowerCase())
const canViewPayments = (role) => ["owner", "admin", "manager"].includes(String(role || "").toLowerCase())

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(24,196,145,${alpha})`
  const clean = hex.replace("#", "")
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  const int = Number.parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const firstName = (value) => (value || "").trim().split(/\s+/)[0] || "there"
const formatRoleLabel = (role) => {
  const value = String(role || "owner").toLowerCase()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const business = useAppStore((state) => state.business)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const setBusiness = useAppStore((state) => state.setBusiness)
  const setBranches = useAppStore((state) => state.setBranches)
  const setSelectedBranchId = useAppStore((state) => state.setSelectedBranchId)
  const setServices = useAppStore((state) => state.setServices)
  const setAppointments = useAppStore((state) => state.setAppointments)
  const setStaff = useAppStore((state) => state.setStaff)
  const setCustomers = useAppStore((state) => state.setCustomers)
  const setPayments = useAppStore((state) => state.setPayments)
  const setExpenses = useAppStore((state) => state.setExpenses)

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const role = String(user?.role || "owner").toLowerCase()
  const hasBranches = business?.hasBranches === true
  const canAccessBranchFeature = canAccessBranchesPlan(business?.subscription?.plan)
  const canUseBranches = hasBranches && canAccessBranchFeature

  const sidebarWidth = useMemo(() => (collapsed ? "w-20" : "w-64"), [collapsed])
  const brandColor = business?.brandColor || "#18c491"
  const subscription = business?.subscription || { plan: "free", status: "active" }
  const displayName = business?.name || user?.name || "Loading..."
  const canViewSettings = role === "owner"
  const navItems = useMemo(() => {
    const baseItems = baseNavItems.filter((item) => {
      if (item.path === "/dashboard/staff") return canManageStaff(role)
      if (item.path === "/dashboard/services") return canViewServices(role)
      if (item.path === "/dashboard/payments") return canViewPayments(role)
      return true
    })
    const ownerItems = canAccessBranchFeature ? ownerOnlyItems : ownerOnlyItems.filter((item) => item.path !== "/dashboard/branches")
    const branchItems = role === "owner" || role === "admin" || role === "manager"
      ? ownerItems.filter((item) => item.path === "/dashboard/branches")
      : []
    const ownerExtraItems = role === "owner"
      ? ownerItems.filter((item) => item.path !== "/dashboard/branches")
      : []
    return [...baseItems, ...branchItems, ...ownerExtraItems]
  }, [canAccessBranchFeature, role])
  const onboardingDone = isOnboardingCompleted()
  const branchScopeId = canUseBranches ? (role === "owner" || role === "admin" || role === "manager" ? selectedBranchId : user?.branchId || "") : ""

  useEffect(() => {
    const loadData = async () => {
      if (!token) return
      setLoading(true)
      try {
        const biz = await api.getBusinessMe(token)
        setBusiness(biz)

        const allowBranches = canAccessBranchesPlan(biz?.subscription?.plan)
        if (!allowBranches) {
          setBranches([])
          setSelectedBranchId("")
        }

        const nextBranchScopeId = allowBranches
          ? (biz?.hasBranches === true ? (role === "owner" || role === "admin" || role === "manager" ? selectedBranchId : user?.branchId || "") : "")
          : ""

        const results = await Promise.allSettled([
          allowBranches ? api.getBranches(token) : Promise.resolve([]),
          api.getServices(token, { branchId: nextBranchScopeId }),
          api.getBookings(token, { branchId: nextBranchScopeId }),
          api.getStaff(token, { branchId: nextBranchScopeId }),
          api.getCustomers(token, { branchId: nextBranchScopeId }),
          api.getPayments(token, { branchId: nextBranchScopeId }),
          api.getExpenses(token, { branchId: nextBranchScopeId }),
        ])

        const [branchList, services, bookings, staff, customers, payments, expenses] = results

        if (allowBranches && branchList.status === "fulfilled") {
          setBranches(branchList.value)
          const availableIds = new Set(branchList.value.map((item) => item.id))
          if (role !== "owner" && role !== "admin" && role !== "manager") {
            setSelectedBranchId(user?.branchId || "")
          } else if (selectedBranchId && !availableIds.has(selectedBranchId)) {
            setSelectedBranchId("")
          }
        }
        if (services.status === "fulfilled") setServices(services.value)
        if (bookings.status === "fulfilled") setAppointments(bookings.value)
        if (staff.status === "fulfilled") setStaff(staff.value)
        if (customers.status === "fulfilled") setCustomers(customers.value)
        if (payments.status === "fulfilled") setPayments(payments.value)
        if (expenses.status === "fulfilled") setExpenses(expenses.value)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [
    token,
    branchScopeId,
    role,
    selectedBranchId,
    user?.branchId,
    setAppointments,
    setBranches,
    setBusiness,
    setCustomers,
    setExpenses,
    setPayments,
    setSelectedBranchId,
    setServices,
    setStaff,
  ])

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", brandColor)
  }, [brandColor])

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to log out?")
    if (!confirmed) return
    logout()
    navigate("/")
  }

  return (
    <div className="brand-dashboard min-h-screen bg-pearl-50 text-ink-900 dark:bg-ink-950 dark:text-pearl-100">
      <div className="pointer-events-none absolute inset-0 -z-10 ambient-bg opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 texture-layer" />

      <aside
        className={`fixed left-0 top-0 z-40 hidden h-full border-r border-white/30 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 lg:block ${sidebarWidth}`}
        style={{ backgroundColor: hexToRgba(brandColor, 0.16) }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-6">
            <div className="flex items-center gap-3">
              {business?.logo ? (
                <img src={business.logo} alt={business.name} className="h-10 w-10 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-ink-950" style={{ backgroundColor: hexToRgba(brandColor, 0.9) }}>
                  <span className="font-display text-lg">{firstName(displayName).charAt(0).toUpperCase()}</span>
                </div>
              )}
              {!collapsed && (
                <div>
                  <div className="text-sm font-semibold">{displayName}</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                    {formatRoleLabel(user?.role)}
                  </div>
                </div>
              )}
            </div>
            <button
              className="hidden rounded-full border border-white/50 p-2 text-ink-700 transition hover:text-emerald-500 dark:border-white/10 dark:text-pearl-100 lg:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <Menu size={16} />
            </button>
          </div>

          <nav className="flex-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? "text-white" : "text-ink-700/70 hover:bg-white/70 dark:text-pearl-100/70 dark:hover:bg-white/5"
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { backgroundColor: brandColor, boxShadow: `0 14px 30px -20px ${hexToRgba(brandColor, 0.9)}` }
                      : undefined
                  }
                >
                  <Icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
          <div className="px-5 pb-6">
            {canViewSettings ? (
              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  `mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-transparent text-white"
                      : "border-white/50 bg-white/70 text-ink-700/80 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/80 dark:hover:bg-white/10"
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: brandColor, boxShadow: `0 14px 30px -20px ${hexToRgba(brandColor, 0.9)}` }
                    : undefined
                }
              >
                <Settings size={18} />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            ) : null}
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-xs uppercase tracking-[0.3em] text-ink-700/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/60">
              {business?.type || "Service"} business
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {subscription.status !== "active" && (
          <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs uppercase tracking-[0.2em] text-amber-500">
            <span>
              {subscription.status === "expired"
                ? "Your paid plan expired and you have been moved to the Free plan."
                : "Subscription inactive. You are currently on the Free plan."}
            </span>
            {user?.role !== "staff" ? (
              <button
                className="rounded-full border border-amber-500/40 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] transition hover:bg-amber-500/10"
                onClick={() => navigate("/dashboard/billing")}
              >
                Renew now
              </button>
            ) : null}
          </div>
        )}
        <header className="sticky top-0 z-30 border-b border-white/30 bg-white/70 backdrop-blur-2xl dark:border-white/10 dark:bg-ink-950/70">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              className="rounded-full border border-white/50 p-2 text-ink-700 dark:border-white/10 dark:text-pearl-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                {displayName}
              </div>
              <div className="text-lg font-semibold">
                {onboardingDone
                  ? `Welcome back, ${firstName(user?.name || business?.name || "there")}`
                  : "Welcome, let's set up your business."}
              </div>
              {canUseBranches && branches.length ? (
                <div className="mt-3 min-w-[220px]">
                  <select
                    className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-white/10 dark:text-pearl-100"
                    value={branchScopeId}
                    onChange={(event) => setSelectedBranchId(event.target.value)}
                    disabled={role !== "owner" && role !== "admin" && role !== "manager"}
                  >
                    {(role === "owner" || role === "admin" || role === "manager") && <option value="">All branches</option>}
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {canViewSettings ? (
                <button
                  className="hidden items-center gap-2 rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-[0.3em] text-ink-700 transition hover:text-emerald-500 dark:border-white/10 dark:text-pearl-100 md:inline-flex"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
              ) : null}
              <button className="rounded-full border border-white/50 p-2 text-ink-700 transition hover:text-emerald-500 dark:border-white/10 dark:text-pearl-100">
                <Bell size={18} />
              </button>
              <DarkModeToggle />
              <button
                className="hidden rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-[0.3em] dark:border-white/10 md:block"
                onClick={handleLogout}
              >
                Logout
              </button>
              <div className="relative">
                <button
                  className="hidden rounded-full border border-white/50 px-4 py-2 text-xs uppercase tracking-[0.3em] dark:border-white/10 md:block"
                  onClick={() => setProfileOpen((prev) => !prev)}
                >
                  {formatRoleLabel(user?.role)}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-44 rounded-2xl border border-white/40 bg-white/90 p-2 text-xs uppercase tracking-[0.2em] shadow-soft dark:border-white/10 dark:bg-ink-950">
                    <div className="rounded-xl px-3 py-2">{user?.email || ""}</div>
                    <button className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/60" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 py-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur">
          <motion.div
            className="h-full w-72 bg-white/90 p-6 dark:bg-ink-950"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.65, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{business?.name || "Dashboard"}</div>
              <button className="text-ink-700 dark:text-pearl-100" onClick={() => setMobileOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-700/80 hover:bg-white dark:text-pearl-100/80 dark:hover:bg-white/5"
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              {canViewSettings ? (
                <NavLink
                  to="/dashboard/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-700/80 hover:bg-white dark:text-pearl-100/80 dark:hover:bg-white/5"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </NavLink>
              ) : null}
              <button className="lux-button-secondary mt-3 w-full" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {loading && <div className="fixed bottom-6 right-6 rounded-full bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.2em] shadow-soft dark:bg-ink-900">Syncing data...</div>}
    </div>
  )
}

