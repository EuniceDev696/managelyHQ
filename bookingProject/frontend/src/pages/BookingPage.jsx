import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { addDays, format } from "date-fns"
import { api } from "../utils/api"
import { formatCurrency, formatDuration } from "../utils/formatters"

const timeSlots = ["09:00", "10:00", "11:30", "13:00", "15:00", "16:30", "18:00"]
const DEFAULT_BRAND = "#18c491"
const HEAD_BRANCH_ID = "__head_branch__"

const hexToRgba = (hex, alpha = 1) => {
  const clean = (hex || DEFAULT_BRAND).replace("#", "")
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed)) return `rgba(24,196,145,${alpha})`
  const r = (parsed >> 16) & 255
  const g = (parsed >> 8) & 255
  const b = parsed & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const toGoogleCalendarDate = (date) =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")

export default function BookingPage() {
  const { businessSlug } = useParams()
  const [searchParams] = useSearchParams()
  const preselectedService = searchParams.get("service")
  const preselectedBranchId = searchParams.get("branchId")

  const [business, setBusiness] = useState(null)
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [bookingsForDay, setBookingsForDay] = useState([])
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [selectedStaff, setSelectedStaff] = useState("")
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [selectedTime, setSelectedTime] = useState("")
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" })
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [error, setError] = useState("")
  const headBranchOption = useMemo(() => {
    if (!business?.address && !business?.phone) return null
    return {
      id: HEAD_BRANCH_ID,
      name: `${business?.name || "Business"} HQ`,
      address: business?.address || "",
      phone: business?.phone || "",
      email: business?.email || "",
    }
  }, [business?.address, business?.email, business?.name, business?.phone])
  const branchOptions = useMemo(
    () => (headBranchOption ? [headBranchOption, ...branches] : branches),
    [branches, headBranchOption],
  )
  const effectiveBranchId = selectedBranchId === HEAD_BRANCH_ID ? "" : selectedBranchId

  useEffect(() => {
    const load = async () => {
      try {
        const page = await api.getPublicBookingPage(businessSlug, { branchId: preselectedBranchId })
        setBusiness(page.business)
        setBranches(page.branches || [])
        setServices(page.services)
        setStaff(page.staff)
        const defaultBranchId =
          preselectedBranchId && page.branches?.some((branch) => branch.id === preselectedBranchId)
            ? preselectedBranchId
            : page.branches?.length === 1
              ? page.branches[0].id
              : ""
        setSelectedBranchId(defaultBranchId)
        const defaultService =
          preselectedService && page.services.some((item) => item.id === preselectedService)
            ? preselectedService
            : page.services[0]?.id || ""
        setSelectedService(defaultService)
      } catch (err) {
        setError(err.message || "Unable to load booking page.")
      }
    }
    load()
  }, [businessSlug, preselectedBranchId, preselectedService])

  useEffect(() => {
    const syncBranchData = async () => {
      if (!businessSlug) return
      try {
        const page = await api.getPublicBookingPage(businessSlug, { branchId: effectiveBranchId })
        setBusiness(page.business)
        setBranches(page.branches || [])
        setServices(page.services)
        setStaff(page.staff)
        if (effectiveBranchId && !page.branches.some((branch) => branch.id === effectiveBranchId)) {
          setSelectedBranchId(page.branches[0]?.id || "")
        }
      } catch (err) {
        setError(err.message || "Unable to load booking page.")
      }
    }
    syncBranchData()
  }, [businessSlug, effectiveBranchId])

  useEffect(() => {
    const syncBookings = async () => {
      if (!business?.id || !selectedDate) return
      const booked = await api.getPublicBookings(business.id, selectedDate, { slug: businessSlug, branchId: effectiveBranchId })
      setBookingsForDay(booked)
    }
    syncBookings()
  }, [business?.id, businessSlug, effectiveBranchId, selectedDate])

  useEffect(() => {
    const brand = business?.brandColor || DEFAULT_BRAND
    document.documentElement.style.setProperty("--brand-color", brand)
  }, [business?.brandColor])

  const dates = useMemo(() => Array.from({ length: 7 }, (_, idx) => addDays(new Date(), idx)), [])

  const selectedBranch = useMemo(
    () => branchOptions.find((branch) => branch.id === selectedBranchId) || null,
    [branchOptions, selectedBranchId],
  )
  const availableStaff = useMemo(
    () => staff.filter((member) => member.availableForBooking !== false),
    [staff],
  )
  const canChoosePreferredBranch = branchOptions.length > 1
  const visibleServices = services
  const effectiveSelectedService =
    visibleServices.some((service) => service.id === selectedService)
      ? selectedService
      : visibleServices[0]?.id || ""
  const effectiveSelectedStaff =
    selectedStaff && availableStaff.some((member) => member.name === selectedStaff) ? selectedStaff : ""
  const selectedServiceObj = useMemo(
    () => services.find((item) => item.id === effectiveSelectedService) || null,
    [effectiveSelectedService, services],
  )

  const unavailable = useMemo(() => new Set(bookingsForDay.map((item) => item.time)), [bookingsForDay])
  const brandColor = business?.brandColor || DEFAULT_BRAND

  const nextFromStep1 = () => {
    if (!effectiveSelectedService) return setError("Select a service to continue.")
    if (canChoosePreferredBranch && !selectedBranchId) return setError("Select a preferred branch to continue.")
    setError("")
    setStep(2)
  }

  const nextFromStep2 = () => {
    if (!selectedDate || !selectedTime) return setError("Select date and time.")
    setError("")
    setStep(3)
  }

  const confirmBooking = async () => {
    if (!business?.id || !selectedServiceObj) return
    if (!customer.name || !customer.email || !customer.phone) {
      setError("Please fill your name, email, and phone.")
      return
    }

    try {
      const booking = await api.addPublicBooking(
        business.id,
        {
          customer: customer.name,
          email: customer.email,
          phone: customer.phone,
          serviceId: selectedServiceObj.id,
          service: selectedServiceObj.name,
          staff: effectiveSelectedStaff || "Any available staff",
          branchId: effectiveBranchId || undefined,
          date: selectedDate,
          time: selectedTime,
        },
        { slug: businessSlug, branchId: effectiveBranchId },
      )
      setConfirmedBooking(booking)
      setError("")
    } catch (err) {
      setError(err.message || "Could not complete booking.")
    }
  }

  const addToCalendar = () => {
    if (!confirmedBooking) return
    const start = new Date(`${confirmedBooking.date}T${confirmedBooking.time}:00`)
    if (Number.isNaN(start.getTime())) return
    const duration = Number(
      services.find((item) => item.id === confirmedBooking.serviceId)?.duration || 60,
    )
    const end = new Date(start.getTime() + duration * 60 * 1000)
    const text = encodeURIComponent(`${business.name} - ${confirmedBooking.service}`)
    const details = encodeURIComponent(
      `Booking confirmed with ${business.name}.${confirmedBooking.staff ? ` Preferred staff: ${confirmedBooking.staff}.` : ""}`,
    )
    const dates = `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (error && !business) return <main className="py-24 text-center text-rose-500">{error}</main>
  if (!business) return <main className="py-24 text-center">Loading...</main>

  if (confirmedBooking) {
    return (
      <main className="relative py-24 sm:py-28">
        <div className="mx-auto w-full max-w-3xl px-6">
          <motion.div className="glass-card rounded-[32px] p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Booking confirmed</p>
            <h1 className="mt-3 text-3xl font-semibold">Your booking has been received.</h1>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-2xl border border-white/40 p-3">Business: {business.name}</div>
              {(branches.length || headBranchOption) ? (
                <div className="rounded-2xl border border-white/40 p-3">
                  Branch: {selectedBranch?.name || branches.find((branch) => branch.id === (confirmedBooking.branchId || selectedBranchId))?.name || "Main branch"}
                </div>
              ) : null}
              <div className="rounded-2xl border border-white/40 p-3">Service: {confirmedBooking.service}</div>
              <div className="rounded-2xl border border-white/40 p-3">
                Price: {formatCurrency(Number(selectedServiceObj?.price || confirmedBooking.price || 0))}
              </div>
              <div className="rounded-2xl border border-white/40 p-3">
                Booking link: {window.location.origin}/book/{business.slug || businessSlug}{confirmedBooking.branchId ? `?branchId=${confirmedBooking.branchId}` : ""}
              </div>
              <div className="rounded-2xl border border-white/40 p-3">
                Preferred staff: {confirmedBooking.staff || "Any available staff"}
              </div>
              <div className="rounded-2xl border border-white/40 p-3">Date: {confirmedBooking.date}</div>
              <div className="rounded-2xl border border-white/40 p-3">Time: {confirmedBooking.time}</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="lux-button-primary" onClick={addToCalendar}>
                Add to Calendar
              </button>
              <button className="lux-button-secondary" onClick={() => window.location.reload()}>
                Book another
              </button>
            </div>
            <div className="mt-8 rounded-2xl border border-white/45 bg-white/65 p-4 text-sm dark:border-white/15 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-subdued">Powered by ManagelyHQ</p>
              <p className="mt-2 text-ink-700/80 dark:text-pearl-100/75">
                Own a service business? Run your bookings, staff, and operations in one place.
              </p>
              <a
                href="/register?source=booking_confirmation"
                className="mt-3 inline-flex rounded-full border border-primary-500/40 bg-primary-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600"
              >
                Start with ManagelyHQ
              </a>
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative py-24 sm:py-28">
      <div className="mx-auto w-full max-w-5xl px-6">
        <motion.div
          className="rounded-[32px] border border-white/50 bg-white/70 p-8 shadow-luxe backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.65, 0.3, 1] }}
        >
          <p className="text-xs uppercase tracking-[0.4em]" style={{ color: business.brandColor || "#18c491" }}>
            Step {step} of 3
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Book with {business.name}</h1>
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

          {step === 1 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Choose service</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleServices.map((service) => (
                  <button
                    key={service.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      effectiveSelectedService === service.id
                        ? "font-medium"
                        : "border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/5"
                    }`}
                    style={
                      effectiveSelectedService === service.id
                        ? {
                            borderColor: hexToRgba(brandColor, 0.55),
                            backgroundColor: hexToRgba(brandColor, 0.16),
                            color: brandColor,
                          }
                        : undefined
                    }
                    onClick={() => setSelectedService(service.id)}
                  >
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={service.name}
                        className="mb-4 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                    <div className="text-[11px] uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      Service
                    </div>
                    <div className="mt-1 font-semibold">{service.name}</div>
                    {service.description ? (
                      <div className="mt-2 text-sm leading-6 text-ink-700/75 dark:text-pearl-100/75">
                        {service.description}
                      </div>
                    ) : null}
                    <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      Price
                    </div>
                    <div className="mt-1 text-sm font-medium">{formatCurrency(Number(service.price || 0))}</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      Duration
                    </div>
                    <div className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
                      {formatDuration(service.duration)}
                    </div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      {service.branchId
                        ? `Branch: ${branches.find((branch) => branch.id === service.branchId)?.name || "Selected branch"}`
                        : "Available at all branches"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.2em] text-subdued">
                  Preferred staff
                </label>
                <div
                  className="mt-2 rounded-2xl border bg-white/80 p-1.5 shadow-sm transition-all duration-200 dark:bg-white/10"
                  style={{
                    borderColor: effectiveSelectedStaff ? hexToRgba(brandColor, 0.45) : undefined,
                    boxShadow: effectiveSelectedStaff ? `0 0 0 2px ${hexToRgba(brandColor, 0.12)}` : undefined,
                  }}
                >
                  <select
                    className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-strong outline-none"
                    value={effectiveSelectedStaff}
                    onChange={(event) => setSelectedStaff(event.target.value)}
                  >
                    <option value="">Any available staff</option>
                    {availableStaff.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-ink-700/70 dark:text-pearl-100/70">
                  {effectiveSelectedStaff
                    ? `Preferred staff: ${effectiveSelectedStaff}`
                    : "Any available staff will be assigned."}
                </p>
              </div>
              {canChoosePreferredBranch ? (
                <div className="mt-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-subdued">
                    Preferred branch
                  </label>
                  <div
                    className="mt-2 rounded-2xl border bg-white/80 p-1.5 shadow-sm transition-all duration-200 dark:bg-white/10"
                    style={{
                      borderColor: selectedBranchId ? hexToRgba(brandColor, 0.45) : undefined,
                      boxShadow: selectedBranchId ? `0 0 0 2px ${hexToRgba(brandColor, 0.12)}` : undefined,
                    }}
                  >
                    <select
                      className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-strong outline-none"
                      value={selectedBranchId}
                      onChange={(event) => {
                        setSelectedBranchId(event.target.value)
                        setSelectedStaff("")
                        setSelectedTime("")
                      }}
                    >
                      <option value="">Select preferred branch</option>
                      {branchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-700/70 dark:text-pearl-100/70">
                    {selectedBranch
                      ? `Preferred branch: ${selectedBranch.name}`
                      : "Choose the branch you want to visit."}
                  </p>
                </div>
              ) : null}
              <div className="mt-6 flex justify-end">
                <button className="lux-button-primary" onClick={nextFromStep1}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-lg font-semibold">Select date and time</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {dates.map((date) => {
                  const value = format(date, "yyyy-MM-dd")
                  return (
                    <button
                      key={value}
                      onClick={() => {
                        setSelectedDate(value)
                        setSelectedTime("")
                      }}
                      className={`rounded-2xl border px-4 py-3 text-xs uppercase tracking-[0.2em] ${
                        selectedDate === value
                          ? "font-medium"
                          : "border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/5"
                      }`}
                      style={
                        selectedDate === value
                          ? {
                              borderColor: hexToRgba(brandColor, 0.55),
                              backgroundColor: hexToRgba(brandColor, 0.16),
                              color: brandColor,
                            }
                          : undefined
                      }
                    >
                      {format(date, "MMM dd")}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {timeSlots.map((time) => {
                  const disabled = unavailable.has(time)
                  return (
                    <button
                      key={time}
                      disabled={disabled}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-2xl border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                        selectedTime === time
                          ? "font-medium"
                          : "border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/5"
                      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                      style={
                        selectedTime === time
                          ? {
                              borderColor: hexToRgba(brandColor, 0.55),
                              backgroundColor: hexToRgba(brandColor, 0.16),
                              color: brandColor,
                            }
                          : undefined
                      }
                    >
                      {time}
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <button className="lux-button-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="lux-button-primary" onClick={nextFromStep2}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold">Enter your details</h2>
              <input
                className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10"
                placeholder="Full name"
                value={customer.name}
                onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10"
                placeholder="Email"
                type="email"
                value={customer.email}
                onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10"
                placeholder="Phone"
                value={customer.phone}
                onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <div className="rounded-2xl border border-white/40 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="font-medium">{selectedServiceObj?.name}</div>
                <div className="mt-1 text-ink-700/70 dark:text-pearl-100/70">
                  {formatCurrency(Number(selectedServiceObj?.price || 0))} • {selectedDate} • {selectedTime}
                </div>
              </div>
              <div className="flex justify-between">
                <button className="lux-button-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button className="lux-button-primary" onClick={confirmBooking}>
                  Confirm booking
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
        </motion.div>
      </div>
    </main>
  )
}

