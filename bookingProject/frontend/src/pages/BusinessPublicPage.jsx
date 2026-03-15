import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { api } from "../utils/api"
import { formatCurrency, formatDuration } from "../utils/formatters"

export default function BusinessPublicPage() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [branches, setBranches] = useState([])
  const [error, setError] = useState("")
  const [activeBranchFilter, setActiveBranchFilter] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const page = await api.getPublicBusinessPageById(businessId)
        setBusiness(page.business)
        setServices(page.services)
        setBranches(page.branches || [])
      } catch (err) {
        setError(err.message || "Unable to load business page.")
      }
    }
    load()
  }, [businessId])

  const buttonStyle = business?.brandColor ? { backgroundColor: business.brandColor } : {}
  const canChoosePreferredBranch = branches.length > 1
  const branchServiceCounts = useMemo(
    () =>
      branches.reduce((acc, branch) => {
        acc[branch.id] = services.filter((service) => !service.branchId || service.branchId === branch.id).length
        return acc
      }, {}),
    [branches, services],
  )
  const filteredServices = useMemo(() => {
    if (!activeBranchFilter) return services
    return services.filter((service) => !service.branchId || service.branchId === activeBranchFilter)
  }, [activeBranchFilter, services])

  if (error) return <main className="py-24 text-center text-rose-500">{error}</main>
  if (!business) return <main className="py-24 text-center">Loading...</main>

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-6">
        <motion.section
          className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-white/60" />
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: business.brandColor || "#18c491" }}>
                  {business.type}
                </p>
                <h1 className="text-3xl font-semibold">{business.name}</h1>
                <p className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
                  {business.description || "Book your service in minutes."}
                </p>
                {(business.address || business.phone) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {business.address ? (
                      <span className="rounded-full border border-white/45 bg-white/70 px-3 py-1.5 text-xs text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/80">
                        {business.address}
                      </span>
                    ) : null}
                    {business.phone ? (
                      <span className="rounded-full border border-white/45 bg-white/70 px-3 py-1.5 text-xs text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/80">
                        {business.phone}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <Link to={`/book/${business.slug}`} className="rounded-full px-6 py-3 text-sm font-semibold text-white" style={buttonStyle}>
              Book Appointment
            </Link>
          </div>

          {canChoosePreferredBranch ? (
            <div className="mt-8">
              <div className="text-sm font-semibold">Browse services by preferred branch</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    !activeBranchFilter ? "text-white" : "border-white/40 bg-white/60 text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                  }`}
                  style={!activeBranchFilter ? buttonStyle : undefined}
                  onClick={() => setActiveBranchFilter("")}
                >
                  All services
                </button>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                      activeBranchFilter === branch.id
                        ? "text-white"
                        : "border-white/40 bg-white/60 text-ink-800 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                    }`}
                    style={activeBranchFilter === branch.id ? buttonStyle : undefined}
                    onClick={() => setActiveBranchFilter(branch.id)}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {filteredServices.length === 0 && <p className="text-sm text-ink-700/70 dark:text-pearl-100/70">No services yet.</p>}
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-lg font-semibold">{service.name}</div>
                <div className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
                  {formatDuration(service.duration)} | {formatCurrency(Number(service.price || 0))}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                  {service.branchId
                    ? `Available at ${branches.find((branch) => branch.id === service.branchId)?.name || "selected branch"}`
                    : "Available at all branches"}
                </div>
                <Link
                  to={`/book/${business.slug}?service=${service.id}${service.branchId ? `&branchId=${service.branchId}` : activeBranchFilter ? `&branchId=${activeBranchFilter}` : ""}`}
                  className="mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  style={buttonStyle}
                >
                  Book now
                </Link>
              </motion.div>
            ))}
          </div>

          {canChoosePreferredBranch ? (
            <div className="mt-8 rounded-3xl border border-white/40 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-semibold">Available branches</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{branch.name}</div>
                      <Link
                        to={`/book/${business.slug}?branchId=${branch.id}`}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                        style={buttonStyle}
                      >
                        Book here
                      </Link>
                    </div>
                    {branch.address ? <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">{branch.address}</div> : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                      <span>{branchServiceCounts[branch.id] || 0} services</span>
                      {branch.phone ? <span>{branch.phone}</span> : null}
                      {branch.email ? <span>{branch.email}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </motion.section>
      </div>
    </main>
  )
}
