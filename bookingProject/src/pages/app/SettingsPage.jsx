import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import DarkModeToggle from "../../components/common/DarkModeToggle"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"
import { canAccessBranchesPlan } from "../../utils/plans"

const notificationOptionLabels = [
  ["customerConfirmation", "Customer confirmations"],
  ["customerReminder", "Customer reminders"],
  ["customerCancellation", "Cancellation emails"],
  ["customerReschedule", "Reschedule emails"],
  ["ownerNewBookingAlert", "Owner booking alerts"],
  ["staffAssignment", "Staff assignment alerts"],
]
const notificationChannelLabels = [
  ["email", "Email", ""],
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const updateUser = useAuthStore((state) => state.updateUser)
  const business = useAppStore((state) => state.business)
  const setBusiness = useAppStore((state) => state.setBusiness)

  const [form, setForm] = useState({
    name: business?.name || "",
    description: business?.description || "",
    brandColor: business?.brandColor || "#18c491",
    logo: business?.logo || "",
    notificationSettings: {
      customerConfirmation: business?.notificationSettings?.customerConfirmation !== false,
      customerReminder: business?.notificationSettings?.customerReminder !== false,
      customerCancellation: business?.notificationSettings?.customerCancellation !== false,
      customerReschedule: business?.notificationSettings?.customerReschedule !== false,
      ownerNewBookingAlert: business?.notificationSettings?.ownerNewBookingAlert !== false,
      staffAssignment: business?.notificationSettings?.staffAssignment !== false,
      channels: {
        email: business?.notificationSettings?.channels?.email !== false,
      },
    },
    currentPassword: "",
    newPassword: "",
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [colorOpen, setColorOpen] = useState(false)
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [enablingBranches, setEnablingBranches] = useState(false)
  const canUseBranches = canAccessBranchesPlan(business?.subscription?.plan)
  const brandOptions = [
    { name: "Emerald", value: "#18c491" },
    { name: "Royal Blue", value: "#2a4cff" },
    { name: "Gold", value: "#e9c16a" },
    { name: "Midnight", value: "#0f172a" },
    { name: "Rose", value: "#ec4899" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Cobalt", value: "#2563eb" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Forest", value: "#166534" },
    { name: "Olive", value: "#4d7c0f" },
    { name: "Sunset", value: "#f97316" },
    { name: "Ruby", value: "#e11d48" },
    { name: "Plum", value: "#7c3aed" },
    { name: "Slate", value: "#475569" },
    { name: "Charcoal", value: "#111827" },
    { name: "Sand", value: "#c9a46a" },
  ]

  const onFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, logo: String(reader.result || "") }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!business) return
    setForm((prev) => ({
      ...prev,
      name: business.name || "",
      description: business.description || "",
      brandColor: business.brandColor || "#18c491",
      logo: business.logo || "",
      notificationSettings: {
        customerConfirmation: business?.notificationSettings?.customerConfirmation !== false,
        customerReminder: business?.notificationSettings?.customerReminder !== false,
        customerCancellation: business?.notificationSettings?.customerCancellation !== false,
        customerReschedule: business?.notificationSettings?.customerReschedule !== false,
        ownerNewBookingAlert: business?.notificationSettings?.ownerNewBookingAlert !== false,
        staffAssignment: business?.notificationSettings?.staffAssignment !== false,
        channels: {
          email: business?.notificationSettings?.channels?.email !== false,
        },
      },
    }))
  }, [business])

  const saveBusiness = async () => {
    if (!token) return
    setError("")
    const updated = await api.updateBusiness(token, {
      name: form.name,
      description: form.description,
      brandColor: form.brandColor,
      logo: form.logo,
      notificationSettings: form.notificationSettings,
    })
    setBusiness(updated)
    updateUser({ name: updated.name })
    setMessage("Business settings updated.")
  }

  const changePassword = async () => {
    if (!token || !form.currentPassword || !form.newPassword) {
      setError("Enter current and new password.")
      return
    }
    try {
      await api.changePassword(token, form.currentPassword, form.newPassword)
      setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }))
      setMessage("Password updated.")
      setError("")
    } catch (err) {
      setError(err.message || "Could not update password.")
    }
  }

  const deleteAccount = async () => {
    if (!token) return
    try {
      setDeletingAccount(true)
      setError("")
      await api.deleteAccount(token)
      logout()
      window.location.href = "/"
    } catch (err) {
      setError(err.message || "Could not delete account.")
    } finally {
      setDeletingAccount(false)
      setDeleteWarningOpen(false)
    }
  }

  const enableBranches = async () => {
    if (!token || business?.hasBranches === true || !canUseBranches) return

    try {
      setEnablingBranches(true)
      setError("")
      setMessage("")
      const updated = await api.updateBusiness(token, { hasBranches: true })
      setBusiness(updated)
      setMessage("Branch management enabled. You can now add branches.")
      navigate("/dashboard/branches")
    } catch (err) {
      setError(err.message || "Could not enable branch management.")
    } finally {
      setEnablingBranches(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Settings</p>
        <h1 className="text-3xl font-semibold">Business settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Business info</div>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" placeholder="Business name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <textarea className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" placeholder="Short description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div className="rounded-2xl border border-white/40 bg-white/60 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                Brand color
              </div>
              <div className="relative mt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                  onClick={() => setColorOpen((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: form.brandColor }} />
                    {brandOptions.find((item) => item.value === form.brandColor)?.name || "Custom"}
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Select</span>
                </button>
                {colorOpen && (
                  <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/40 bg-white/95 p-2 shadow-soft dark:border-white/10 dark:bg-ink-950">
                    {brandOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/70 dark:hover:bg-white/5"
                        onClick={() => {
                          setForm({ ...form, brandColor: option.value })
                          setColorOpen(false)
                        }}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.value }} />
                        {option.name}
                      </button>
                    ))}
                    <label className="mt-2 flex items-center justify-between rounded-xl border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.2em]">
                      Custom
                      <input
                        type="color"
                        value={form.brandColor}
                        onChange={(event) => setForm({ ...form, brandColor: event.target.value })}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-3 py-2 text-sm">
              <span>Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
              />
            </label>
            <button className="lux-button-primary w-full" onClick={saveBusiness}>Save business settings</button>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Security</div>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" type="password" placeholder="Current password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
            <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" type="password" placeholder="New password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
            <button className="lux-button-secondary w-full" onClick={changePassword}>Update password</button>
            <button
              className="w-full rounded-full border border-rose-500/40 px-4 py-3 text-sm font-semibold text-rose-500"
              onClick={() => {
                setDeleteWarningOpen((prev) => !prev)
                setError("")
                setMessage("")
              }}
            >
              Delete account
            </button>
            {deleteWarningOpen ? (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
                <div className="font-semibold uppercase tracking-[0.2em]">Warning</div>
                <p className="mt-2">
                  Deleting your account will permanently remove your business, staff, bookings, customers, payments, expenses, services, and branches.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    className="flex-1 rounded-full border border-white/40 px-4 py-3 text-sm font-semibold text-ink-700 dark:border-white/10 dark:text-pearl-100"
                    onClick={() => setDeleteWarningOpen(false)}
                    disabled={deletingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={deleteAccount}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? "Deleting..." : "Yes, delete everything"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Theme preference</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-ink-700/70 dark:text-pearl-100/70">Toggle dark / light mode</span>
            <DarkModeToggle />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Branches</div>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            Turn on branch management later if you started with a single location and want to add more.
          </p>
          {business?.hasBranches === true ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
              Branch management is enabled for this business.
            </div>
          ) : !canUseBranches ? (
            <>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-ink-700/80 dark:text-pearl-100/80">
                Branch management is available on the Pro plan only.
              </div>
              <button
                type="button"
                className="lux-button-secondary mt-4 w-full"
                onClick={() => navigate("/dashboard/billing")}
              >
                Upgrade to unlock branches
              </button>
            </>
          ) : (
            <button
              type="button"
              className="lux-button-primary mt-4 w-full"
              onClick={enableBranches}
              disabled={enablingBranches}
            >
              {enablingBranches ? "Enabling..." : "Add branches"}
            </button>
          )}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Notification defaults</div>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            These apply to business-wide bookings and new branches unless a branch override is saved.
          </p>
          <div className="mt-4 space-y-2">
            {notificationOptionLabels.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 px-3 py-2 text-sm dark:border-white/10">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={form.notificationSettings[key]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        [key]: event.target.checked,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-5 border-t border-white/20 pt-4">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
              Customer delivery channels
            </div>
            <div className="mt-3 space-y-2">
              {notificationChannelLabels.map(([key, label, note]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 px-3 py-2 text-sm dark:border-white/10">
                  <span>
                    {label}
                    {note ? <span className="ml-2 text-xs text-ink-700/60 dark:text-pearl-100/60">{note}</span> : null}
                  </span>
                  <input
                    type="checkbox"
                    checked={form.notificationSettings.channels[key]}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          channels: {
                            ...prev.notificationSettings.channels,
                            [key]: event.target.checked,
                          },
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-3 text-sm text-emerald-500">{message}</div>}
      {error && <div className="rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-500">{error}</div>}
    </div>
  )
}

