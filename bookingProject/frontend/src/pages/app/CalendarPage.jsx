import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay } from "date-fns"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"

export default function CalendarPage() {
  const today = new Date()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState(format(today, "yyyy-MM-dd"))
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState("")

  const appointments = useAppStore((state) => state.appointments)
  const setAppointments = useAppStore((state) => state.setAppointments)
  const services = useAppStore((state) => state.services)
  const staff = useAppStore((state) => state.staff)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const role = String(user?.role || "owner").toLowerCase()
  const branchScopeId = role === "owner" || role === "admin" ? selectedBranchId : user?.branchId || ""
  const canChooseBranch = role === "owner" || role === "admin"
  const [modalBranchId, setModalBranchId] = useState(branchScopeId)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const dayList = []
    let day = start
    while (day <= end) {
      dayList.push(day)
      day = addDays(day, 1)
    }
    return dayList
  }, [currentMonth])

  const appointmentsForDate = appointments.filter((apt) => apt.date === selectedDate)
  const timeSlots = ["09:00", "10:00", "11:30", "13:00", "15:00", "16:30"]
  const availableServices = services.filter((service) => !modalBranchId || !service.branchId || service.branchId === modalBranchId)
  const availableStaff = staff.filter((member) => !modalBranchId || !member.branchId || member.branchId === modalBranchId)

  const handleAdd = async (event) => {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.target)
    const time = String(form.get("time") || "")
    const conflict = appointmentsForDate.some((apt) => apt.time === time && apt.status !== "cancelled")
    if (conflict) {
      setError("That time is already booked.")
      return
    }

    try {
      const resolvedBranchId = canChooseBranch ? modalBranchId || "" : branchScopeId || ""
      if (branches.length > 1 && !resolvedBranchId) {
        setError("Select a branch for this appointment.")
        return
      }
      const serviceId = String(form.get("serviceId") || "")
      const selectedService = availableServices.find((item) => item.id === serviceId) || services.find((item) => item.id === serviceId) || null
      const fallbackPrice = Number(form.get("price") || 0)
      await api.addOwnerBooking(token, {
        customer: String(form.get("customer") || "Guest"),
        branchId: resolvedBranchId || undefined,
        serviceId: serviceId || "",
        service: selectedService?.name || String(form.get("service") || "General Service"),
        staff: String(form.get("staff") || ""),
        date: selectedDate,
        time,
        status: "confirmed",
        price: selectedService ? Number(selectedService.price || 0) : fallbackPrice,
      })
      const refreshed = await api.getBookings(token, { branchId: branchScopeId })
      setAppointments(refreshed)
      setError("")
      setShowModal(false)
    } catch (err) {
      setError(err.message || "Could not add appointment.")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Calendar</p>
          <h1 className="text-3xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="lux-button-secondary" onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>Previous</button>
          <button className="lux-button-secondary" onClick={() => setCurrentMonth(today)}>Today</button>
          <button className="lux-button-secondary" onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>Next</button>
          <button className="lux-button-primary" onClick={() => { setModalBranchId(branchScopeId); setShowModal(true) }}>Add appointment</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-3xl p-6">
          <div className="grid grid-cols-7 gap-3 text-center text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-3">
            {days.map((day) => {
              const value = format(day, "yyyy-MM-dd")
              const isSelected = value === selectedDate
              return (
                <button
                  key={value}
                  className={`rounded-2xl border px-3 py-4 text-sm transition ${
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-500"
                      : "border-white/40 bg-white/70 text-ink-700/70 hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70"
                  } ${isSameMonth(day, currentMonth) ? "" : "opacity-40"}`}
                  onClick={() => setSelectedDate(value)}
                >
                  <div>{format(day, "d")}</div>
                  {isSameDay(day, today) && <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-emerald-500">Today</div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Appointments</div>
          <div className="mt-4 space-y-3 text-sm">
            {appointmentsForDate.length === 0 && <div className="text-ink-700/60 dark:text-pearl-100/60">No appointments yet.</div>}
            {appointmentsForDate.map((apt) => (
              <motion.div key={apt.id} className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5" layout>
                <div className="flex items-center justify-between"><span>{apt.customer}</span><span className="text-emerald-500">{apt.time}</span></div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">{apt.service} • {apt.staff || "Unassigned"}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form className="w-full max-w-lg rounded-[32px] border border-white/40 bg-white/90 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onSubmit={handleAdd}>
              <div className="text-lg font-semibold">New appointment</div>
              <div className="mt-4 grid gap-3">
                <input name="customer" placeholder="Customer name" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" />
                <select
                  name="branchId"
                  className="rounded-2xl border border-white/40 px-3 py-2 text-sm"
                  value={canChooseBranch ? modalBranchId : branchScopeId}
                  onChange={(event) => setModalBranchId(event.target.value)}
                  disabled={!canChooseBranch}
                >
                  {canChooseBranch ? <option value="">Select branch</option> : null}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <select name="serviceId" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" defaultValue="">
                  <option value="">Select saved service</option>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {Number(service.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
                <input name="service" placeholder="Or type custom service" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" />
                <input name="price" type="number" min="0" step="0.01" placeholder="Price" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" />
                <select name="staff" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" defaultValue="">
                  <option value="">Unassigned staff</option>
                  {availableStaff.map((member) => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
                <select name="time" className="rounded-2xl border border-white/40 px-3 py-2 text-sm" defaultValue={timeSlots[0]}>
                  {timeSlots.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className="lux-button-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lux-button-primary">Save</button>
              </div>
              {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
