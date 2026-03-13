import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"
import UpgradeRequiredModal from "../../components/common/UpgradeRequiredModal"
import { canAccessBranchesPlan, getPlan, isPaidPlan } from "../../utils/plans"
import { validateRequiredText } from "../../utils/validation"

const roleOptions = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
]

export default function StaffPage() {
  const initialForm = {
    name: "",
    email: "",
    password: "",
    role: "staff",
    branchId: "",
    availability: "Mon - Sat",
    services: [],
    availableForBooking: true,
    active: true,
  }
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const staff = useAppStore((state) => state.staff)
  const setStaff = useAppStore((state) => state.setStaff)
  const services = useAppStore((state) => state.services)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const business = useAppStore((state) => state.business)
  const subscription = business?.subscription || { plan: "free" }
  const plan = getPlan(subscription.plan)
  const staffLimit = plan.limits?.staff ?? 0
  const role = String(user?.role || "owner").toLowerCase()
  const branchAccessEnabled = business?.hasBranches === true && canAccessBranchesPlan(subscription.plan)
  const branchScopeId = role === "owner" || role === "admin" || role === "manager" ? selectedBranchId : user?.branchId || ""
  const canChooseBranch = branchAccessEnabled && (role === "owner" || role === "admin" || role === "manager")
  const canManageStaff = role === "owner" || role === "admin" || role === "manager"
  const canDeleteStaff = role === "owner" || role === "admin"
  const canManageLoginAccess = role === "owner"
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(""), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!error) return undefined
    const timer = window.setTimeout(() => setError(""), 4000)
    return () => window.clearTimeout(timer)
  }, [error])

  const [form, setForm] = useState({ ...initialForm, branchId: branchScopeId || "" })
  const [editingId, setEditingId] = useState("")

  const resetForm = () => {
    setForm({ ...initialForm, branchId: branchScopeId || "" })
    setEditingId("")
  }

  const toggleService = (id) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(id) ? prev.services.filter((srv) => srv !== id) : [...prev.services, id],
    }))
  }

  const sync = async () => {
    if (!token) return
    const next = await api.getStaff(token, { branchId: branchScopeId })
    setStaff(next)
  }

  const handleSubmit = async () => {
    if (!token) return
    const isEditing = Boolean(editingId)
    const requiredError = validateRequiredText(form.name, "Staff name")
    if (requiredError) {
      setError(requiredError)
      return
    }
    if (!isEditing && Number.isFinite(staffLimit) && staff.length >= staffLimit) {
      setShowUpgrade(true)
      return
    }
    try {
      setError("")
      setNotice("")
      const payload = {
        name: form.name,
        role: form.role,
        branchId: canChooseBranch ? form.branchId || null : branchScopeId || null,
        availability: form.availability,
        services: form.services,
        availableForBooking: form.availableForBooking,
      }
      if (canManageLoginAccess) {
        payload.email = form.active ? form.email : ""
        payload.active = form.active
      } else if (!isEditing) {
        payload.active = false
      }
      if (canManageLoginAccess && form.active && form.password) {
        payload.password = form.password
      }
      if (isEditing) {
        await api.updateStaff(token, editingId, payload)
      } else {
        await api.addStaff(token, { ...payload, password: canManageLoginAccess && form.active ? form.password : "" })
      }
      await sync()
      setNotice(isEditing ? "Staff member updated." : "Staff member added.")
      resetForm()
    } catch (err) {
      setError(err.message || `Could not ${isEditing ? "update" : "add"} staff member.`)
    }
  }

  const handleEdit = (member) => {
    setError("")
    setNotice("")
    setEditingId(member.id)
    setForm({
      name: member.name || "",
      email: member.email || "",
      password: "",
      role: member.role || "staff",
      branchId: member.branchId || "",
      availability: member.availability || "Mon - Sat",
      services: Array.isArray(member.services) ? member.services : [],
      availableForBooking: member.availableForBooking !== false,
      active: member.active !== false,
    })
  }

  const toggleActive = async (member) => {
    if (!token) return
    try {
      setError("")
      setNotice("")
      await api.updateStaff(token, member.id, { active: !member.active })
      await sync()
      setNotice(`Staff member ${member.active === false ? "enabled" : "disabled"}.`)
    } catch (err) {
      setError(err.message || "Could not update staff status.")
    }
  }

  const toggleBookingAvailability = async (member) => {
    if (!token) return
    try {
      setError("")
      setNotice("")
      await api.updateStaff(token, member.id, { availableForBooking: member.availableForBooking === false })
      await sync()
      setNotice(`Staff member ${member.availableForBooking === false ? "shown for booking" : "hidden from booking"}.`)
    } catch (err) {
      setError(err.message || "Could not update booking availability.")
    }
  }

  const handleDelete = async (member) => {
    if (!token) return
    const confirmed = window.confirm(`Delete ${member.name}? This cannot be undone.`)
    if (!confirmed) return
    try {
      setError("")
      setNotice("")
      await api.deleteStaff(token, member.id)
      await sync()
      setNotice("Staff member deleted.")
    } catch (err) {
      setError(err.message || "Could not delete staff member.")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Staff</p>
        <h1 className="text-3xl font-semibold">Team management</h1>
        <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
          Plan limit: {Number.isFinite(staffLimit) ? `${staff.length}/${staffLimit} staff used` : "Unlimited staff"}.
        </p>
        {!canManageLoginAccess ? (
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            Only the owner can give staff login access. Admins and managers can still add team members and assign branches on paid plans.
          </p>
        ) : null}
        {notice ? <p className="mt-2 text-sm text-emerald-600">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {staff.length === 0 && (
            <div className="rounded-3xl border border-white/50 bg-white/70 p-6 text-sm text-ink-700/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
              Add Your First Team Member
            </div>
          )}
          {staff.map((member) => (
            <motion.div key={member.id} className="glass-card rounded-3xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{member.name}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">{member.role || "staff"}</div>
                  <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    member.active === false
                      ? "bg-rose-500/15 text-rose-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}>
                    {member.active === false ? "Access disabled" : "Access enabled"}
                  </div>
                  <div className={`mt-1 ml-2 inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    member.availableForBooking === false
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-sky-500/15 text-sky-600"
                  }`}>
                    {member.availableForBooking === false ? "Hidden from booking" : "Shown in booking"}
                  </div>
                  {member.email ? (
                    <div className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">{member.email}</div>
                  ) : null}
                  {branchAccessEnabled ? (
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      Branch: {member.branchId ? branches.find((branch) => branch.id === member.branchId)?.name || "Assigned branch" : "All branches"}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {canManageStaff ? (
                    <>
                      <button className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase" onClick={() => handleEdit(member)}>
                        Edit
                      </button>
                      {canManageLoginAccess ? (
                        <button className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase" onClick={() => toggleActive(member)}>
                          {member.active === false ? "Enable login" : "Disable login"}
                        </button>
                      ) : null}
                      <button className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase" onClick={() => toggleBookingAvailability(member)}>
                        {member.availableForBooking === false ? "Show in booking" : "Hide from booking"}
                      </button>
                      {canDeleteStaff ? (
                        <button
                          className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase text-rose-500"
                          onClick={() => handleDelete(member)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(member.services || []).map((srv) => (
                  <span key={srv} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-500">
                    {services.find((item) => item.id === srv)?.name || "Service"}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">Availability: {member.availability || "Mon - Sat"}</div>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">{editingId ? "Edit staff member" : "Add staff member"}</div>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            {canManageStaff
              ? canManageLoginAccess
                ? "Owners can create staff profiles and decide whether each person gets login access."
                : "Admins and managers can add staff profiles, but only the owner can add login credentials or enable sign-in."
              : "Managers can review team assignments here, but only owners and admins can create or change staff accounts."}
          </p>
          <div className={`mt-4 space-y-3 ${canManageStaff ? "" : "pointer-events-none opacity-60"}`}>
            <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            {canManageLoginAccess ? (
              <>
                <label className="flex items-center justify-between rounded-2xl border border-white/40 px-3 py-2 text-sm">
                  <span>Give login access</span>
                  <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                </label>
                {form.active ? (
                  <>
                    <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" placeholder="Staff email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                    <input
                      className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                      placeholder={editingId ? "New password (leave blank to keep current)" : "Temporary password"}
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                    <p className="text-xs text-ink-700/60 dark:text-pearl-100/60">
                      {editingId
                        ? "If you set a new password here, the staff member will be required to create a personal password on next sign-in."
                        : "This is a temporary password. The staff member will be required to create a personal password on first sign-in."}
                    </p>
                  </>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-white/40 px-3 py-3 text-sm text-ink-700/70 dark:text-pearl-100/70">
                Staff added here will not get login access until the owner enables it.
              </div>
            )}
            <label className="flex items-center justify-between rounded-2xl border border-white/40 px-3 py-2 text-sm">
              <span>Available for booking</span>
              <input
                type="checkbox"
                checked={form.availableForBooking}
                onChange={(event) => setForm({ ...form, availableForBooking: event.target.checked })}
              />
            </label>
            <select className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {branchAccessEnabled ? (
              <select
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                value={canChooseBranch ? form.branchId : branchScopeId}
                onChange={(event) => setForm({ ...form, branchId: event.target.value })}
                disabled={!canChooseBranch}
              >
                {canChooseBranch ? <option value="">All branches</option> : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            ) : null}
            <input className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm" placeholder="Availability" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} />
            <div className="space-y-2">
              {services.map((srv) => (
                <label key={srv.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={form.services.includes(srv.id)} onChange={() => toggleService(srv.id)} />
                  {srv.name}
                </label>
              ))}
            </div>
            <button className="lux-button-primary w-full" onClick={handleSubmit}>
              {editingId ? "Save changes" : "Add staff"}
            </button>
            {editingId ? (
              <button className="lux-button-secondary w-full" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <UpgradeRequiredModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Staff limit reached"
        description={`Your ${plan.name} plan allows up to ${Number.isFinite(staffLimit) ? staffLimit : "unlimited"} staff accounts. Upgrade to add more.`}
      />
    </div>
  )
}

