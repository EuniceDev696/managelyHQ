import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./store/useAuthStore"
import PublicLayout from "./layout/PublicLayout"
import DashboardGate from "./components/guards/DashboardGate"
import PublicOnlyRoute from "./components/guards/PublicOnlyRoute"
import RoleRoute from "./components/guards/RoleRoute"
import OnboardingOnly from "./components/guards/OnboardingOnly"
import OnboardingRequired from "./components/guards/OnboardingRequired"
import AuthRequired from "./components/guards/AuthRequired"
import { isAuthenticatedUser } from "./utils/auth"
import { getPostAuthRedirect } from "./utils/onboarding"

const LandingPage = lazy(() => import("./pages/LandingPage"))
const PricingPage = lazy(() => import("./pages/PricingPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const CheckEmailPage = lazy(() => import("./pages/CheckEmailPage"))
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"))
const StaffResetPasswordPage = lazy(() => import("./pages/StaffResetPasswordPage"))
const SignupPage = lazy(() => import("./pages/SignupPage"))
const BookingPage = lazy(() => import("./pages/BookingPage"))
const RegisterPage = lazy(() => import("./pages/RegisterPage"))
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"))
const BusinessPublicPage = lazy(() => import("./pages/BusinessPublicPage"))
const OverviewPage = lazy(() => import("./pages/app/OverviewPage"))
const CalendarPage = lazy(() => import("./pages/app/CalendarPage"))
const AppointmentsPage = lazy(() => import("./pages/app/AppointmentsPage"))
const ServicesPage = lazy(() => import("./pages/app/ServicesPage"))
const StaffPage = lazy(() => import("./pages/app/StaffPage"))
const CustomersPage = lazy(() => import("./pages/app/CustomersPage"))
const PaymentsPage = lazy(() => import("./pages/app/PaymentsPage"))
const AnalyticsPage = lazy(() => import("./pages/app/AnalyticsPage"))
const BranchManagementPage = lazy(() => import("./pages/app/BranchManagementPage"))
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"))
const BillingPage = lazy(() => import("./pages/app/BillingPage"))

function RouteFallback() {
  return (
    <main className="flex min-h-[40vh] items-center justify-center px-6 py-16">
      <div className="rounded-full border border-white/30 bg-white/70 px-5 py-2 text-sm text-ink-700 shadow-soft dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/80">
        Loading...
      </div>
    </main>
  )
}

const withSuspense = (node) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>

function RootRoute() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  if (isAuthenticatedUser(user, token)) return <Navigate to={getPostAuthRedirect()} replace />
  return (
    <PublicLayout>
      {withSuspense(<LandingPage />)}
    </PublicLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/home"
          element={
            <PublicLayout>
              {withSuspense(<LandingPage />)}
            </PublicLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <PublicLayout>
              {withSuspense(<PricingPage />)}
            </PublicLayout>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <PublicLayout>
                {withSuspense(<LoginPage />)}
              </PublicLayout>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicLayout>
              {withSuspense(<VerifyEmailPage />)}
            </PublicLayout>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <PublicLayout>
                {withSuspense(<SignupPage />)}
              </PublicLayout>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <PublicLayout>
                {withSuspense(<RegisterPage />)}
              </PublicLayout>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/check-email"
          element={
            <PublicLayout>
              {withSuspense(<CheckEmailPage />)}
            </PublicLayout>
          }
        />
        <Route
          path="/staff/reset-password"
          element={
            <AuthRequired>
              <PublicLayout>
                {withSuspense(<StaffResetPasswordPage />)}
              </PublicLayout>
            </AuthRequired>
          }
        />
        <Route
          path="/onboarding/*"
          element={
            <OnboardingOnly>
              {withSuspense(<OnboardingPage />)}
            </OnboardingOnly>
          }
        />
        <Route
          path="/book/:businessSlug"
          element={
            <PublicLayout>
              {withSuspense(<BookingPage />)}
            </PublicLayout>
          }
        />
        <Route
          path="/business/:businessId"
          element={
            <PublicLayout>
              {withSuspense(<BusinessPublicPage />)}
            </PublicLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <OnboardingRequired>
              <DashboardGate />
            </OnboardingRequired>
          }
        >
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={withSuspense(<OverviewPage />)} />
          <Route path="calendar" element={withSuspense(<CalendarPage />)} />
          <Route path="appointments" element={withSuspense(<AppointmentsPage />)} />
          <Route path="services" element={withSuspense(<ServicesPage />)} />
          <Route
            path="staff"
            element={
              <RoleRoute allow={["owner", "admin", "manager"]}>
                {withSuspense(<StaffPage />)}
              </RoleRoute>
            }
          />
          <Route path="customers" element={withSuspense(<CustomersPage />)} />
          <Route path="payments" element={withSuspense(<PaymentsPage />)} />
          <Route
            path="branches"
            element={
              <RoleRoute allow={["owner", "admin", "manager"]}>
                {withSuspense(<BranchManagementPage />)}
              </RoleRoute>
            }
          />
          <Route
            path="analytics"
            element={
              <RoleRoute allow={["owner"]}>
                {withSuspense(<AnalyticsPage />)}
              </RoleRoute>
            }
          />
          <Route
            path="settings"
            element={
              <RoleRoute allow={["owner"]}>
                {withSuspense(<SettingsPage />)}
              </RoleRoute>
            }
          />
          <Route
            path="billing"
            element={
              <RoleRoute allow={["owner"]}>
                {withSuspense(<BillingPage />)}
              </RoleRoute>
            }
          />
        </Route>

        <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

