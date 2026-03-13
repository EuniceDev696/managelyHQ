import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"

const statuses = ["pending", "confirmed", "completed", "cancelled"]
const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos_card", label: "POS card" },
  { value: "online_card", label: "Online card" },
]

const statusClass = {
  pending: "bg-amber-500/20 text-amber-500",
  confirmed: "bg-emerald-500/20 text-emerald-500",
  completed: "bg-blue-500/20 text-blue-500",
  cancelled: "bg-rose-500/20 text-rose-500",
}

const notificationClass = {
  sent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  failed: "bg-rose-500/15 text-rose-500",
  none: "bg-white/50 text-ink-700/60 dark:bg-white/5 dark:text-pearl-100/60",
}

const paymentClass = {
  paid: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  partial: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  unpaid: "bg-rose-500/15 text-rose-500",
}

export default function AppointmentsPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const appointments = useAppStore((state) => state.appointments)
  const setAppointments = useAppStore((state) => state.setAppointments)
  const staff = useAppStore((state) => state.staff)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const role = String(user?.role || "owner").toLowerCase()
  const branchScopeId = role === "owner" || role === "admin" ? selectedBranchId : user?.branchId || ""
  const canChooseBranch = role === "owner" || role === "admin"

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [emailFilter, setEmailFilter] = useState("all")
  const [staffFilter, setStaffFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    customer: "",
    service: "",
    branchId: "",
    date: "",
    time: "",
    status: "pending",
  })
  const [actionError, setActionError] = useState("")
  const [actionNotice, setActionNotice] = useState("")
  const [sendingReminders, setSendingReminders] = useState(false)
  const [resendingPurpose, setResendingPurpose] = useState("")
  const [completionPrompt, setCompletionPrompt] = useState({ open: false, bookingId: "", method: "cash" })
  const canManageNotifications = ["owner", "admin", "manager"].includes(role)

  useEffect(() => {
    if (!actionNotice) return undefined
    const timer = window.setTimeout(() => setActionNotice(""), 4000)
    return () => window.clearTimeout(timer)
  }, [actionNotice])

  useEffect(() => {
    if (!actionError) return undefined
    const timer = window.setTimeout(() => setActionError(""), 4000)
    return () => window.clearTimeout(timer)
  }, [actionError])

  const getNotificationMeta = (appointment) => {
    const status = appointment?.notificationStatus
    if (!status?.event) {
      return { label: "No email activity", tone: "none" }
    }

    return status.event === "notifications.email_failed"
      ? { label: "Email failed", tone: "failed" }
      : { label: "Email sent", tone: "sent" }
  }

  const getPaymentMeta = (appointment) => {
    const status = String(appointment?.paymentSummary?.status || "").toLowerCase()
    if (status === "paid" || String(appointment?.status || "").toLowerCase() === "completed") {
      return { label: "Paid", tone: "paid" }
    }
    if (status === "partial") {
      return { label: "Part paid", tone: "partial" }
    }
    return { label: "Unpaid", tone: "unpaid" }
  }

  const filtered = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch = (apt.customer || "").toLowerCase().includes(search.toLowerCase())
      const matchesStatus = status === "all" || apt.status === status
      const notificationTone = getNotificationMeta(apt).tone
      const matchesEmail =
        emailFilter === "all" ||
        (emailFilter === "failed" && notificationTone === "failed") ||
        (emailFilter === "sent" && notificationTone === "sent") ||
        (emailFilter === "none" && notificationTone === "none")
      const matchesStaff = staffFilter === "all" || apt.staff === staffFilter
      const matchesDate = !dateFilter || apt.date === dateFilter
      return matchesSearch && matchesStatus && matchesEmail && matchesStaff && matchesDate
    })
  }, [appointments, search, status, emailFilter, staffFilter, dateFilter])

  const handleStatus = async (id, nextStatus) => {
    if (!token) return
    if (nextStatus === "completed") {
      setCompletionPrompt({ open: true, bookingId: id, method: "cash" })
      return
    }
    try {
      setActionError("")
      setActionNotice("")
      await api.updateBookingStatus(token, id, nextStatus)
      const refreshed = await api.getBookings(token, { branchId: branchScopeId })
      setAppointments(refreshed)
      setActionNotice("Booking status updated.")
    } catch (err) {
      setActionError(err.message || "Could not update booking status.")
    }
  }

  const confirmCompletion = async () => {
    if (!token || !completionPrompt.bookingId) return
    try {
      setActionError("")
      setActionNotice("")
      await api.updateBookingStatus(token, completionPrompt.bookingId, "completed", completionPrompt.method)
      const refreshed = await api.getBookings(token, { branchId: branchScopeId })
      setAppointments(refreshed)
      setCompletionPrompt({ open: false, bookingId: "", method: "cash" })
      setActionNotice("Booking completed and payment recorded.")
    } catch (err) {
      setActionError(err.message || "Could not complete booking.")
    }
  }

  const beginEdit = (apt) => {
    setActionError("")
    setActionNotice("")
    setSelected(apt)
    setEditForm({
      customer: apt.customer || "",
      service: apt.service || "",
      branchId: apt.branchId || "",
      date: apt.date || "",
      time: apt.time || "",
      status: apt.status || "pending",
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!token || !selected?.id) return
    try {
      setActionError("")
      setActionNotice("")
      await api.updateBooking(token, selected.id, {
        ...editForm,
        branchId: canChooseBranch ? editForm.branchId || null : branchScopeId || null,
      })
      const refreshed = await api.getBookings(token, { branchId: branchScopeId })
      setAppointments(refreshed)
      const nextSelected = refreshed.find((item) => item.id === selected.id) || null
      setSelected(nextSelected)
      setEditing(false)
      setActionNotice("Booking updated.")
    } catch (err) {
      setActionError(err.message || "Could not update booking.")
    }
  }

  const deleteBooking = async (apt) => {
    if (!token || !apt?.id) return
    const confirmed = window.confirm(`Delete booking for ${apt.customer || "this customer"}?`)
    if (!confirmed) return
    try {
      setActionError("")
      setActionNotice("")
      await api.deleteBooking(token, apt.id)
      const refreshed = await api.getBookings(token, { branchId: branchScopeId })
      setAppointments(refreshed)
      if (selected?.id === apt.id) {
        setSelected(null)
        setEditing(false)
      }
      setActionNotice("Booking deleted.")
    } catch (err) {
      setActionError(err.message || "Could not delete booking.")
    }
  }

  const sendReminders = async () => {
    if (!token) return
    if (!dateFilter) {
      setActionError("Select a date before sending reminders.")
      return
    }

    try {
      setSendingReminders(true)
      setActionError("")
      setActionNotice("")
      const response = await api.sendBookingReminders(token, dateFilter, { branchId: branchScopeId })
      const sent = Number(response.sent || 0)
      const failed = Number(response.failed || 0)
      setActionNotice(
        failed > 0
          ? `Reminder emails sent for ${sent} booking(s). ${failed} failed.`
          : `Reminder emails sent for ${sent} booking(s).`,
      )
    } catch (err) {
      setActionError(err.message || "Could not send reminder emails.")
    } finally {
      setSendingReminders(false)
    }
  }

  const resendBookingEmail = async (purpose) => {
    if (!token || !selected?.id) return
    try {
      setResendingPurpose(purpose)
      setActionError("")
      setActionNotice("")
      await api.resendBookingNotification(token, selected.id, purpose)
      setActionNotice(purpose === "booking_confirmation" ? "Confirmation email resent." : "Reminder email resent.")
    } catch (err) {
      setActionError(err.message || "Could not resend booking email.")
    } finally {
      setResendingPurpose("")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Appointments</p>
        <h1 className="text-3xl font-semibold">Manage bookings</h1>
        {actionNotice ? <p className="mt-2 text-sm text-emerald-600">{actionNotice}</p> : null}
        {actionError ? <p className="mt-2 text-sm text-rose-500">{actionError}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="rounded-2xl border border-white/50 bg-white/80 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          placeholder="Search customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-2xl border border-white/50 bg-white/80 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          value={staffFilter}
          onChange={(event) => setStaffFilter(event.target.value)}
        >
          <option value="all">All staff</option>
          {staff.map((member) => (
            <option key={member.id} value={member.name}>{member.name}</option>
          ))}
        </select>
        <select
          className="rounded-2xl border border-white/50 bg-white/80 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          value={emailFilter}
          onChange={(event) => setEmailFilter(event.target.value)}
        >
          <option value="all">All email states</option>
          <option value="failed">Email failed</option>
          <option value="sent">Email sent</option>
          <option value="none">No email activity</option>
        </select>
        <input
          className="rounded-2xl border border-white/50 bg-white/80 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        />
        {["owner", "admin", "manager"].includes(user?.role) ? (
          <button className="lux-button-secondary" onClick={sendReminders} disabled={sendingReminders || !dateFilter}>
            {sendingReminders ? "Sending..." : "Send reminders"}
          </button>
        ) : null}
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((item) => (
          <button
            key={item.key}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
              status === item.key ? "bg-emerald-500/20 text-emerald-500" : "bg-white/70 text-ink-700/60 dark:bg-white/5 dark:text-pearl-100/60"
            }`}
            onClick={() => setStatus(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {completionPrompt.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6">
          <div className="w-full max-w-md rounded-[32px] border border-white/40 bg-white/95 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950">
            <div className="text-lg font-semibold">Record payment for completed appointment</div>
            <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
              Choose how the customer paid so revenue is recorded correctly.
            </p>
            <select
              className="mt-4 w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
              value={completionPrompt.method}
              onChange={(event) => setCompletionPrompt((prev) => ({ ...prev, method: event.target.value }))}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="lux-button-secondary"
                onClick={() => setCompletionPrompt({ open: false, bookingId: "", method: "cash" })}
              >
                Cancel
              </button>
              <button className="lux-button-primary" onClick={confirmCompletion}>
                Complete booking
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-x-auto rounded-3xl border border-white/50 bg-white/70 p-4 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
              <tr>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((apt) => (
                <tr key={apt.id} className="border-t border-white/40 dark:border-white/10">
                  <td className="px-3 py-3">{apt.customer}</td>
                  <td className="px-3 py-3">{apt.service}</td>
                  <td className="px-3 py-3">{apt.date}</td>
                  <td className="px-3 py-3">{apt.time}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusClass[apt.status] || statusClass.pending}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${paymentClass[getPaymentMeta(apt).tone]}`}>
                      {getPaymentMeta(apt).label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${notificationClass[getNotificationMeta(apt).tone]}`}>
                      {getNotificationMeta(apt).label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={apt.status}
                        onChange={(event) => handleStatus(apt.id, event.target.value)}
                        className="rounded-full border border-white/50 bg-white/80 px-3 py-2 text-xs uppercase dark:border-white/10 dark:bg-white/5"
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <button className="lux-button-secondary" onClick={() => setSelected(apt)}>Details</button>
                      <button className="lux-button-secondary" onClick={() => beginEdit(apt)}>Edit</button>
                      <button className="rounded-full border border-rose-500/40 px-3 py-2 text-xs uppercase text-rose-500" onClick={() => deleteBooking(apt)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-6 text-sm text-ink-700/70 dark:text-pearl-100/70">No appointments found.</div>}
        </div>

        <motion.div className="glass-card rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-semibold">Appointment details</div>
          {!selected ? (
            <div className="mt-4 text-sm text-ink-700/60 dark:text-pearl-100/60">Select a booking to view details.</div>
          ) : editing ? (
            <div className="mt-4 space-y-3 text-sm">
              <input
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                value={editForm.customer}
                onChange={(event) => setEditForm({ ...editForm, customer: event.target.value })}
                placeholder="Customer"
              />
              <input
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                value={editForm.service}
                onChange={(event) => setEditForm({ ...editForm, service: event.target.value })}
                placeholder="Service"
              />
              <select
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                value={canChooseBranch ? editForm.branchId : branchScopeId}
                onChange={(event) => setEditForm({ ...editForm, branchId: event.target.value })}
                disabled={!canChooseBranch}
              >
                {canChooseBranch ? <option value="">All branches</option> : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <input
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                type="date"
                value={editForm.date}
                onChange={(event) => setEditForm({ ...editForm, date: event.target.value })}
              />
              <input
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                type="time"
                value={editForm.time}
                onChange={(event) => setEditForm({ ...editForm, time: event.target.value })}
              />
              <select
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                value={editForm.status}
                onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button className="lux-button-primary" onClick={saveEdit}>Save</button>
                <button className="lux-button-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/40 px-4 py-3">Client: {selected.customer}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Email: {selected.email || "No email on file"}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Service: {selected.service}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Branch: {selected.branchId ? branches.find((branch) => branch.id === selected.branchId)?.name || "Assigned branch" : "All branches"}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Date: {selected.date}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Time: {selected.time}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">Status: {selected.status}</div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">
                Payment: {getPaymentMeta(selected).label}
              </div>
              <div className="rounded-2xl border border-white/40 px-4 py-3">
                Email delivery: {getNotificationMeta(selected).label}
                {selected.notificationStatus?.createdAt ? ` on ${new Date(selected.notificationStatus.createdAt).toLocaleString()}` : ""}
                {selected.notificationStatus?.reason ? ` (${selected.notificationStatus.reason})` : ""}
              </div>
              {canManageNotifications && selected.email ? (
                <div className="rounded-2xl border border-white/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">Customer email actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="lux-button-secondary"
                      onClick={() => resendBookingEmail("booking_confirmation")}
                      disabled={Boolean(resendingPurpose)}
                    >
                      {resendingPurpose === "booking_confirmation" ? "Resending..." : "Resend confirmation"}
                    </button>
                    <button
                      className="lux-button-secondary"
                      onClick={() => resendBookingEmail("booking_reminder")}
                      disabled={Boolean(resendingPurpose)}
                    >
                      {resendingPurpose === "booking_reminder" ? "Resending..." : "Resend reminder"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button className="lux-button-secondary" onClick={() => beginEdit(selected)}>Edit booking</button>
                <button
                  className="rounded-full border border-rose-500/40 px-3 py-2 text-xs uppercase text-rose-500"
                  onClick={() => deleteBooking(selected)}
                >
                  Delete booking
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
