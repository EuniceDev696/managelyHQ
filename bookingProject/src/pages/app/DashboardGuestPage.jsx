import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { BarChart3, CalendarDays, CreditCard, LayoutDashboard, Sparkles, Users } from "lucide-react"
import DarkModeToggle from "../../components/common/DarkModeToggle"

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Calendar", icon: CalendarDays },
  { label: "Appointments", icon: CreditCard },
  { label: "Services", icon: Sparkles },
  { label: "Staff", icon: Users },
  { label: "Analytics", icon: BarChart3 },
]

function LockedAction({ label }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-subdued opacity-75"
      title="Create a free account to unlock"
    >
      {label}
    </button>
  )
}

export default function DashboardGuestPage() {
  return (
    <div className="min-h-screen bg-page text-strong dark:bg-ink-950 dark:text-pearl-100">
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 border-r border-border/80 bg-surface/85 p-5 backdrop-blur lg:block dark:border-white/10 dark:bg-ink-900/60">
        <img src="/managelyhq-logo.svg" alt="ManagelyHQ logo" className="h-11 w-11 rounded-xl shadow-sm" />
        <div className="mt-3">
          <div className="text-sm font-semibold">ManagelyHQ</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-subdued">Dashboard preview</div>
        </div>
        <nav className="mt-8 space-y-2">
          {navItems.map((item, index) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${index === 0 ? "bg-primary-500 text-white" : "text-subdued"}`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-page/90 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-ink-950/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-subdued">Guest dashboard</p>
              <h1 className="text-lg font-semibold">Explore the product before you register</h1>
            </div>
            <DarkModeToggle />
          </div>
        </header>

        <main className="px-6 py-8">
          <motion.div
            className="rounded-2xl border border-primary-500/35 bg-gradient-to-r from-primary-500/14 via-primary-500/8 to-transparent p-6 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="text-2xl font-semibold">Start free to unlock the full dashboard</h2>
            <p className="mt-2 text-sm text-body dark:text-pearl-100/75">
              Free plan is limited. Upgrade anytime for unlimited features.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/register" className="lux-button-primary">
                Create free account
              </Link>
              <Link to="/login" className="lux-button-secondary">
                Log in
              </Link>
            </div>
          </motion.div>

          <div className="mt-6 flex flex-wrap gap-3">
            <LockedAction label="Create booking" />
            <LockedAction label="Add staff" />
            <LockedAction label="Export" />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((card) => (
              <div key={card} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="h-3 w-24 rounded-full bg-muted" />
                <div className="mt-4 h-8 w-16 rounded bg-muted" />
                <div className="mt-3 h-2 w-28 rounded-full bg-muted" />
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {[1, 2].map((panel) => (
              <div key={panel} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="h-4 w-36 rounded-full bg-muted" />
                <div className="mt-6 h-44 rounded-xl bg-muted/60 blur-[1px]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-page/80 via-page/10 to-transparent dark:from-ink-950/70" />
                <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-4 rounded-xl border border-border bg-surface/95 px-3 py-2 text-center text-xs uppercase tracking-[0.2em] text-subdued">
                  Register to interact
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}


