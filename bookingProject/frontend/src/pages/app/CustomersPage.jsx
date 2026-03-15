import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"
import { formatCurrency } from "../../utils/formatters"
import { canAccessBranchesPlan } from "../../utils/plans"

const formatDateTime = (date, time = "") => {
  if (!date) return "-"
  const value = time ? `${date}T${time}:00` : date
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? `${date}${time ? ` ${time}` : ""}` : parsed.toLocaleString()
}

export default function CustomersPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const customers = useAppStore((state) => state.customers)
  const setCustomers = useAppStore((state) => state.setCustomers)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const business = useAppStore((state) => state.business)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const role = String(user?.role || "owner").toLowerCase()
  const canEditNotes = ["owner", "admin", "manager"].includes(role)
  const subscription = business?.subscription || { plan: "free" }
  const branchAccessEnabled = business?.hasBranches === true && canAccessBranchesPlan(subscription.plan)
  const activeBranch = branches.find((branch) => branch.id === selectedBranchId) || null
  const branchNameById = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))

  const exportCsv = () => {
    const header = branchAccessEnabled
      ? ["Name", "Branch", "Email", "Phone", "Visits", "Total Spend", "Last Visit", "Notes"]
      : ["Name", "Email", "Phone", "Visits", "Total Spend", "Last Visit", "Notes"]
    const rows = customers.map((cust) => [
      cust.name || "",
      ...(branchAccessEnabled ? [cust.branchId ? branchNameById[cust.branchId] || "Assigned branch" : "All branches"] : []),
      cust.email || "",
      cust.phone || "",
      String(cust.visits || 0),
      String(cust.totalSpend || 0),
      cust.lastVisit || "",
      cust.notes || "",
    ])

    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const today = new Date().toISOString().slice(0, 10)
    link.href = url
    link.setAttribute("download", `customers-${today}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const openCustomer = async (customer) => {
    if (!token) return
    setSelected(customer)
    setDetail(null)
    setDetailError("")
    setDetailLoading(true)
    try {
      const next = await api.getCustomerDetail(token, customer.id, { branchId: selectedBranchId })
      setDetail(next)
      setNotesDraft(next.customer?.notes || "")
    } catch (error) {
      setDetailError(error.message || "Could not load customer history.")
    } finally {
      setDetailLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!token || !selected?.id || !canEditNotes) return
    try {
      setSavingNotes(true)
      setDetailError("")
      const updated = await api.updateCustomer(token, selected.id, { notes: notesDraft })
      setCustomers(customers.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
      setDetail((prev) => (prev ? { ...prev, customer: { ...prev.customer, ...updated } } : prev))
    } catch (error) {
      setDetailError(error.message || "Could not save customer notes.")
    } finally {
      setSavingNotes(false)
    }
  }

  const customerCards = useMemo(
    () =>
      customers.map((cust) => ({
        ...cust,
        branchName: cust.branchId ? branchNameById[cust.branchId] || "Assigned branch" : "All branches",
      })),
    [branchNameById, customers],
  )

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Customers</p>
        <h1 className="text-3xl font-semibold">Client list</h1>
        {branchAccessEnabled ? (
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            Scope: {activeBranch ? `${activeBranch.name} branch` : branches.length ? "All branches" : "Primary business"}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button className="lux-button-secondary" onClick={exportCsv}>Export CSV</button>
        <span className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">{customers.length} clients</span>
      </div>

      {customers.length === 0 && (
        <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-sm text-ink-700/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
          Customers will appear after bookings are made.
        </div>
      )}

      <div className="space-y-4">
        {customerCards.map((cust) => (
          <motion.div key={cust.id} className="glass-card rounded-3xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{cust.name}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                  {cust.visits} visits | {formatCurrency(cust.totalSpend || 0)}
                </div>
                {branchAccessEnabled ? (
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                    Branch: {cust.branchName}
                  </div>
                ) : null}
                {cust.notes ? (
                  <div className="mt-2 line-clamp-2 max-w-xl text-sm text-ink-700/70 dark:text-pearl-100/70">
                    {cust.notes}
                  </div>
                ) : null}
              </div>
              <button className="lux-button-secondary" onClick={() => openCustomer(cust)}>View profile</button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/40 bg-white/90 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
              <button
                type="button"
                className="sticky top-0 z-10 ml-auto inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 shadow-soft transition hover:bg-white dark:border-white/10 dark:bg-ink-950 dark:text-pearl-100 dark:hover:bg-ink-900"
                onClick={() => { setSelected(null); setDetail(null); setDetailError(""); }}
              >
                <X size={14} />
                Close
              </button>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{selected.name}</div>
                  {branchAccessEnabled ? (
                    <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      {selected.branchId ? branchNameById[selected.branchId] || "Assigned branch" : "All branches"}
                    </div>
                  ) : null}
                </div>
              </div>

              {detailLoading ? (
                <div className="mt-4 rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                  Loading customer profile...
                </div>
              ) : detailError ? (
                <div className="mt-4 rounded-2xl border border-rose-500/30 px-4 py-4 text-sm text-rose-500">
                  {detailError}
                </div>
              ) : detail ? (
                <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl border border-white/40 px-4 py-3">Email: {detail.customer?.email || "-"}</div>
                    <div className="rounded-2xl border border-white/40 px-4 py-3">Phone: {detail.customer?.phone || "-"}</div>
                    <div className="rounded-2xl border border-white/40 px-4 py-3">Last visit: {formatDateTime(detail.customer?.lastVisit)}</div>
                    <div className="rounded-2xl border border-white/40 px-4 py-3">Total spend: {formatCurrency(detail.customer?.totalSpend || 0)}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/40 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">Completed</div>
                        <div className="mt-2 text-xl font-semibold">{detail.history?.counts?.completed || 0}</div>
                      </div>
                      <div className="rounded-2xl border border-white/40 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">Cancelled</div>
                        <div className="mt-2 text-xl font-semibold">{detail.history?.counts?.cancelled || 0}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">Favourite services</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(detail.history?.favoriteServices || []).length > 0 ? (
                          detail.history.favoriteServices.map((item) => (
                            <span key={item.name} className="rounded-full border border-white/35 px-3 py-1 text-xs uppercase tracking-[0.16em] dark:border-white/10">
                              {item.name} x{item.count}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-ink-700/70 dark:text-pearl-100/70">No repeat services yet.</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">Internal notes</div>
                      <textarea
                        className="mt-3 min-h-28 w-full rounded-2xl border border-white/40 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        readOnly={!canEditNotes}
                        placeholder="Add private notes for your team."
                      />
                      {canEditNotes ? (
                        <button className="lux-button-primary mt-3" onClick={saveNotes} disabled={savingNotes}>
                          {savingNotes ? "Saving..." : "Save notes"}
                        </button>
                      ) : (
                        <div className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                          View only
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Booking history</div>
                    {(detail.history?.bookings || []).length === 0 ? (
                      <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                        No booking history recorded yet.
                      </div>
                    ) : (
                      detail.history.bookings.map((booking) => (
                        <div key={booking.id} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{booking.service || "Service"}</div>
                            <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-700/70 dark:bg-white/5 dark:text-pearl-100/70">
                              {booking.status}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                            <span>{formatDateTime(booking.date, booking.time)}</span>
                            {branchAccessEnabled ? (
                              <span>
                                {booking.branchId ? branchNameById[booking.branchId] || "Assigned branch" : "All branches"}
                              </span>
                            ) : null}
                            {booking.staff ? <span>{booking.staff}</span> : null}
                            {booking.price ? <span>{formatCurrency(booking.price)}</span> : null}
                          </div>
                          {booking.notes ? (
                            <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
                              {booking.notes}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
