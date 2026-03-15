import PremiumNavbar from "../components/navigation/PremiumNavbar"
import PageTransition from "../components/common/PageTransition"

export default function PublicLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-page text-strong dark:bg-ink-950 dark:text-pearl-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-glow dark:bg-dark-glow" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 ambient-bg" />
      <PremiumNavbar />
      <PageTransition>{children}</PageTransition>
      <footer className="border-t border-border bg-muted py-9 text-sm text-body dark:border-white/10 dark:bg-ink-900 dark:text-pearl-100/75">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-strong dark:text-pearl-100">
              <img src="/managelyhq-logo.svg" alt="ManagelyHQ logo" className="h-8 w-8 rounded-lg" />
              <span>ManagelyHQ</span>
            </div>
            <p>Smart Booking &amp; Business Operations Platform</p>
          </div>
          <div className="flex gap-6">
            {["Platform", "Security", "Pricing", "Contact"].map((item) => (
              <a key={item} className="underline-offset-4 transition hover:text-primary-600 hover:underline" href="#">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}


