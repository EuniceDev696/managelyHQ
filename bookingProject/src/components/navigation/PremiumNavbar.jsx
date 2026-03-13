import { Link, useLocation } from "react-router-dom"
import DarkModeToggle from "../common/DarkModeToggle"
import { useAuthStore } from "../../store/useAuthStore"
import { isAuthenticatedUser } from "../../utils/auth"

export default function PremiumNavbar() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = isAuthenticatedUser(user, token)
  const isCustomerRoute =
    location.pathname.startsWith("/book/") || location.pathname.startsWith("/business/")

  return (
    <nav className="sticky top-0 z-50 border-b border-border/80 bg-page/90 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/85">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-8 px-6 py-4">
        <Link to="/" className="flex items-center gap-4">
          <img src="/managelyhq-logo.svg" alt="ManagelyHQ logo" className="h-11 w-11 rounded-xl shadow-sm" />
          <div>
            <div className="text-base font-semibold text-strong dark:text-pearl-100">ManagelyHQ</div>
            <div className="text-xs uppercase tracking-[0.24em] text-subdued dark:text-pearl-100/60">Smart Booking &amp; Business Operations</div>
          </div>
        </Link>

        <div className="hidden items-center justify-center gap-12 text-sm font-medium text-body dark:text-pearl-100/80 md:flex">
          <a href="/#walkthrough" className="underline-offset-4 transition duration-200 ease-out hover:text-primary-600 hover:underline">
            How it works
          </a>
          <a href="/pricing" className="underline-offset-4 transition duration-200 ease-out hover:text-primary-600 hover:underline">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-4 justify-self-end">
          {isAuthenticated && isCustomerRoute ? (
            <Link
              to="/home"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 md:text-sm"
            >
              Back to Home
            </Link>
          ) : null}
          {isAuthenticated && !isCustomerRoute ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 md:text-sm"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-body/90 underline-offset-4 transition duration-200 ease-out hover:bg-muted/70 hover:text-strong hover:underline focus-visible:ring-primary-500 sm:inline-flex"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 md:text-sm"
              >
                Start Free
              </Link>
            </>
          )}
          <div className="ml-1 hidden border-l border-border/80 pl-3 sm:block dark:border-white/15">
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}


