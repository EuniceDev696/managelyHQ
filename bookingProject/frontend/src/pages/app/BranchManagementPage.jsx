import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { api } from "../../utils/api"
import { canAccessBranchesPlan } from "../../utils/plans"

const initialForm = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  email: "",
  managerStaffId: "",
  active: true,
  notificationSettings: {
    customerConfirmation: true,
    customerReminder: true,
    customerCancellation: true,
    customerReschedule: true,
    ownerNewBookingAlert: true,
    staffAssignment: true,
    channels: {
      email: true,
    },
  },
}

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

const cloneNotificationSettings = (settings) => ({
  customerConfirmation: settings?.customerConfirmation !== false,
  customerReminder: settings?.customerReminder !== false,
  customerCancellation: settings?.customerCancellation !== false,
  customerReschedule: settings?.customerReschedule !== false,
  ownerNewBookingAlert: settings?.ownerNewBookingAlert !== false,
  staffAssignment: settings?.staffAssignment !== false,
  channels: {
    email: settings?.channels?.email !== false,
  },
})

const notificationSettingsMatch = (left, right) =>
  notificationOptionLabels.every(([key]) => Boolean(left?.[key]) === Boolean(right?.[key])) &&
  notificationChannelLabels.every(([key]) => Boolean(left?.channels?.[key]) === Boolean(right?.channels?.[key]))

export default function BranchManagementPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const branches = useAppStore((state) => state.branches)
  const business = useAppStore((state) => state.business)
  const appointments = useAppStore((state) => state.appointments)
  const payments = useAppStore((state) => state.payments)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const setBranches = useAppStore((state) => state.setBranches)
  const setSelectedBranchId = useAppStore((state) => state.setSelectedBranchId)

  const [staffOptions, setStaffOptions] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reassignState, setReassignState] = useState({ open: false, sourceBranchId: "", targetBranchId: "", usage: null, loading: false })
  const [activity, setActivity] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const managerOptions = useMemo(
    () => staffOptions.filter((member) => ["manager", "admin"].includes(String(member.role || "").toLowerCase())),
    [staffOptions],
  )
  const branchNameById = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])), [branches])
  const businessNotificationDefaults = useMemo(
    () => cloneNotificationSettings(business?.notificationSettings),
    [business],
  )
  const branchesUsingBusinessDefaults = useMemo(
    () => branches.filter((branch) => notificationSettingsMatch(cloneNotificationSettings(branch.notificationSettings), businessNotificationDefaults)).length,
    [branches, businessNotificationDefaults],
  )

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(""), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!error) return undefined
    const timer = window.setTimeout(() => setError(""), 5000)
    return () => window.clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (editingId) return
    setForm((prev) => ({
      ...prev,
      notificationSettings: cloneNotificationSettings(businessNotificationDefaults),
    }))
  }, [businessNotificationDefaults, editingId])

  useEffect(() => {
    const loadStaff = async () => {
      if (!token) return
      setLoadingStaff(true)
      try {
        const next = await api.getStaff(token)
        setStaffOptions(next)
      } catch (err) {
        setError(err.message || "Could not load staff for branch assignment.")
      } finally {
        setLoadingStaff(false)
      }
    }
    loadStaff()
  }, [token])

  useEffect(() => {
    const loadActivity = async () => {
      if (!token) return
      setLoadingActivity(true)
      try {
        const next = await api.getBranchActivity(token, { branchId: selectedBranchId || "", limit: 10 })
        setActivity(next)
      } catch (err) {
        setError(err.message || "Could not load branch activity.")
      } finally {
        setLoadingActivity(false)
      }
    }
    loadActivity()
  }, [selectedBranchId, token])

  const branchStats = useMemo(
    () =>
      branches.reduce((acc, branch) => {
        const branchId = branch.id
        acc[branchId] = {
          appointments: appointments.filter((item) => item.branchId === branchId).length,
          revenue: payments
            .filter((item) => item.branchId === branchId && item.status === "success" && item?.metadata?.purpose !== "subscription_upgrade")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        }
        return acc
      }, {}),
    [appointments, branches, payments],
  )

  const resetForm = () => {
    setForm({ ...initialForm, notificationSettings: cloneNotificationSettings(businessNotificationDefaults) })
    setEditingId("")
  }

  const resetBranchNotificationsToDefaults = () => {
    setForm((prev) => ({
      ...prev,
      notificationSettings: cloneNotificationSettings(businessNotificationDefaults),
    }))
  }

  const refreshBranches = async (nextSelectedBranchId = selectedBranchId) => {
    if (!token) return
    const [next, nextActivity] = await Promise.all([
      api.getBranches(token),
      api.getBranchActivity(token, { branchId: nextSelectedBranchId || "", limit: 10 }),
    ])
    setBranches(next)
    setActivity(nextActivity)
    if (nextSelectedBranchId && !next.some((branch) => branch.id === nextSelectedBranchId)) {
      setSelectedBranchId("")
    }
  }

  const describeActivity = (item) => {
    const event = String(item.event || "")
    const meta = item.meta || {}
    const currentBranchName =
      meta.branchName ||
      branchNameById[item.branchId] ||
      branchNameById[meta.branchId] ||
      "Branch"

    if (event === "branches.created") {
      return `${currentBranchName} was created.`
    }
    if (event === "branches.updated") {
      const fields = Array.isArray(item.updatedFields) && item.updatedFields.length
        ? item.updatedFields
        : Array.isArray(meta.updatedFields)
          ? meta.updatedFields
          : []
      return `${currentBranchName} was updated${fields.length ? `: ${fields.join(", ")}` : ""}.`
    }
    if (event === "branches.deleted") {
      return `${currentBranchName} was deleted.`
    }
    if (event === "branches.reassigned") {
      const sourceName = meta.sourceBranchName || branchNameById[meta.sourceBranchId] || currentBranchName
      const targetName = meta.targetBranchName || branchNameById[meta.targetBranchId] || "another branch"
      const totalMoved = Object.values(meta.reassigned || {}).reduce((sum, count) => sum + Number(count || 0), 0)
      return `${sourceName} was reassigned to ${targetName}${totalMoved ? ` with ${totalMoved} linked records moved` : ""}.`
    }
    return event.replace(/^branches\./, "").replace(/_/g, " ")
  }

  const handleSubmit = async () => {
    if (!token) return
    if (!form.name.trim()) {
      setError("Branch name is required.")
      return
    }

    setSaving(true)
    setError("")
    setNotice("")
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        managerStaffId: form.managerStaffId || null,
        active: form.active,
        notificationSettings: form.notificationSettings,
      }
      if (editingId) {
        await api.updateBranch(token, editingId, payload)
      } else {
        await api.addBranch(token, payload)
      }
      await refreshBranches()
      resetForm()
      setNotice(editingId ? "Branch updated." : "Branch created.")
    } catch (err) {
      setError(err.message || `Could not ${editingId ? "update" : "create"} branch.`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (branch) => {
    setEditingId(branch.id)
    setNotice("")
    setError("")
    setForm({
      name: branch.name || "",
      slug: branch.slug || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      managerStaffId: branch.managerStaffId || "",
      active: branch.active !== false,
      notificationSettings: cloneNotificationSettings(branch.notificationSettings),
    })
  }

  const handleDelete = async (branch) => {
    if (!token) return
    const confirmed = window.confirm(`Delete ${branch.name}? This cannot be undone.`)
    if (!confirmed) return

    setError("")
    setNotice("")
    try {
      await api.deleteBranch(token, branch.id)
      await refreshBranches(branch.id === selectedBranchId ? "" : selectedBranchId)
      setNotice("Branch deleted.")
      if (editingId === branch.id) resetForm()
    } catch (err) {
      if (String(err.message || "").includes("Reassign or remove linked records")) {
        setReassignState({
          open: true,
          sourceBranchId: branch.id,
          targetBranchId: branches.find((item) => item.id !== branch.id)?.id || "",
          usage: err.usage || null,
          loading: false,
        })
        return
      }
      setError(err.message || "Could not delete branch.")
    }
  }

  const handleReassignAndDelete = async () => {
    if (!token || !reassignState.sourceBranchId || !reassignState.targetBranchId) {
      setError("Choose a destination branch for reassignment.")
      return
    }
    setReassignState((prev) => ({ ...prev, loading: true }))
    setError("")
    setNotice("")
    try {
      const result = await api.reassignBranch(token, reassignState.sourceBranchId, {
        targetBranchId: reassignState.targetBranchId,
        deleteSource: true,
      })
      await refreshBranches(reassignState.sourceBranchId === selectedBranchId ? reassignState.targetBranchId : selectedBranchId)
      setReassignState({ open: false, sourceBranchId: "", targetBranchId: "", usage: null, loading: false })
      setNotice(`Branch deleted after reassigning ${Object.values(result.reassigned || {}).reduce((sum, count) => sum + Number(count || 0), 0)} linked records.`)
      if (editingId === reassignState.sourceBranchId) resetForm()
    } catch (err) {
      setError(err.message || "Could not reassign and delete branch.")
      setReassignState((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleToggleActive = async (branch) => {
    if (!token) return
    setError("")
    setNotice("")
    try {
      await api.updateBranch(token, branch.id, { active: branch.active === false })
      await refreshBranches()
      setNotice(branch.active === false ? "Branch activated." : "Branch deactivated.")
    } catch (err) {
      setError(err.message || "Could not update branch status.")
    }
  }

  const activeBranches = branches.filter((branch) => branch.active !== false).length
  const formUsesBusinessDefaults = notificationSettingsMatch(form.notificationSettings, businessNotificationDefaults)
  const branchPlanEnabled = canAccessBranchesPlan(business?.subscription?.plan)

  if (business && business.hasBranches !== true) {
    return (
      <div className="rounded-3xl border border-white/50 bg-white/70 p-6 text-sm text-ink-700/80 shadow-soft dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/80">
        <p>Branch management is disabled for this business.</p>
        {branchPlanEnabled ? (
          <button className="lux-button-primary mt-4" onClick={() => navigate("/dashboard/settings")}>
            Enable branches in settings
          </button>
        ) : (
          <button className="lux-button-secondary mt-4" onClick={() => navigate("/dashboard/billing")}>
            Upgrade to unlock branches
          </button>
        )}
      </div>
    )
  }

  if (business && !branchPlanEnabled) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-ink-700/80 shadow-soft dark:text-pearl-100/80">
        <p>Branch management is available on the Pro plan only.</p>
        <button className="lux-button-secondary mt-4" onClick={() => navigate("/dashboard/billing")}>
          Upgrade plan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Branches</p>
        <h1 className="text-3xl font-semibold">Branch management</h1>
        <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
          Manage locations, assign managers, and keep your branch dashboard filter in sync.
        </p>
        <p className="mt-2 text-sm text-ink-700/60 dark:text-pearl-100/60">
          {activeBranches} active of {branches.length} total branches.
        </p>
        <p className="mt-2 text-sm text-ink-700/60 dark:text-pearl-100/60">
          {branchesUsingBusinessDefaults} branch{branchesUsingBusinessDefaults === 1 ? "" : "es"} using business notification defaults.
        </p>
        {notice ? <p className="mt-2 text-sm text-emerald-600">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
      </div>

      {reassignState.open ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Branch is in use</div>
          <p className="mt-2 text-ink-700/80 dark:text-pearl-100/80">
            Reassign linked records to another branch before deleting this one.
          </p>
          {reassignState.usage ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
              {Object.entries(reassignState.usage)
                .filter(([, count]) => Number(count) > 0)
                .map(([key, count]) => (
                  <span key={key}>{count} {key}</span>
                ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <select
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              value={reassignState.targetBranchId}
              onChange={(event) => setReassignState((prev) => ({ ...prev, targetBranchId: event.target.value }))}
            >
              <option value="">Choose destination branch</option>
              {branches
                .filter((branch) => branch.id !== reassignState.sourceBranchId)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </select>
            <button className="lux-button-primary" onClick={handleReassignAndDelete} disabled={reassignState.loading}>
              {reassignState.loading ? "Reassigning..." : "Reassign and delete"}
            </button>
            <button
              className="lux-button-secondary"
              onClick={() => setReassignState({ open: false, sourceBranchId: "", targetBranchId: "", usage: null, loading: false })}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {branches.length === 0 ? (
            <div className="rounded-3xl border border-white/50 bg-white/70 p-6 text-sm text-ink-700/70 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
              Add your first branch to start organizing bookings and reporting by location.
            </div>
          ) : null}

          {branches.map((branch) => {
            const stats = branchStats[branch.id] || { appointments: 0, revenue: 0 }
            const manager = managerOptions.find((member) => member.id === branch.managerStaffId) || staffOptions.find((member) => member.id === branch.managerStaffId)
            const usesBusinessDefaults = notificationSettingsMatch(cloneNotificationSettings(branch.notificationSettings), businessNotificationDefaults)
            return (
              <motion.div key={branch.id} className="glass-card rounded-3xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold">{branch.name}</div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          branch.active === false ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-500"
                        }`}
                      >
                        {branch.active === false ? "Inactive" : "Active"}
                      </span>
                      {selectedBranchId === branch.id ? (
                        <span className="inline-flex rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-600">
                          Current filter
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          usesBusinessDefaults ? "bg-white/50 text-ink-700 dark:bg-white/10 dark:text-pearl-100/80" : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        {usesBusinessDefaults ? "Using defaults" : "Custom overrides"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      /{branch.slug || "branch"}
                    </div>
                    {branch.address ? <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">{branch.address}</div> : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-ink-700/60 dark:text-pearl-100/60">
                      <span>{stats.appointments} visible bookings</span>
                      <span>Visible revenue {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(stats.revenue)}</span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
                      {manager ? <div>Manager: {manager.name}</div> : <div>Manager: Not assigned</div>}
                      {branch.phone ? <div>Phone: {branch.phone}</div> : null}
                      {branch.email ? <div>Email: {branch.email}</div> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase" onClick={() => handleEdit(branch)}>
                      Edit
                    </button>
                    <button className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase" onClick={() => handleToggleActive(branch)}>
                      {branch.active === false ? "Activate" : "Deactivate"}
                    </button>
                    <button
                      className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase text-rose-500"
                      onClick={() => handleDelete(branch)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">{editingId ? "Edit branch" : "Create branch"}</div>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            Owners can create locations and assign a manager. Branch activity here reflects the current dashboard filter.
          </p>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Branch name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Custom slug (optional)"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <textarea
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <select
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              value={form.managerStaffId}
              onChange={(event) => setForm((prev) => ({ ...prev, managerStaffId: event.target.value }))}
              disabled={loadingStaff}
            >
              <option value="">{loadingStaff ? "Loading managers..." : "No manager assigned"}</option>
              {managerOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role || "staff"})
                </option>
              ))}
            </select>
            <label className="flex items-center justify-between rounded-2xl border border-white/40 px-3 py-2 text-sm">
              <span>Branch active</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
            </label>
            <div className="rounded-2xl border border-white/40 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                  Branch notifications
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/40 px-3 py-1 text-[10px] uppercase tracking-[0.16em]"
                  onClick={resetBranchNotificationsToDefaults}
                  disabled={formUsesBusinessDefaults}
                >
                  Reset to defaults
                </button>
              </div>
              <p className="mt-2 text-sm text-ink-700/60 dark:text-pearl-100/60">
                Match this branch to the business-level email defaults, or save a custom branch override.
              </p>
              <div className="mt-3 space-y-2">
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
              <div className="mt-4 border-t border-white/20 pt-4">
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
            <button className="lux-button-primary w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save branch" : "Create branch"}
            </button>
            {editingId ? (
              <button className="lux-button-secondary w-full" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Branch activity</div>
            <p className="mt-1 text-sm text-ink-700/70 dark:text-pearl-100/70">
              Recent branch changes, reassignment actions, and lifecycle updates.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {loadingActivity ? (
            <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
              Loading activity...
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
              No branch activity recorded yet.
            </div>
          ) : (
            activity.map((item) => (
              <div key={item.id || `${item.event}-${item.createdAt}`} className="rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{describeActivity(item)}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                    {new Date(item.createdAt || item.ts || Date.now()).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                  {item.email ? <span>{item.email}</span> : null}
                  {item.role ? <span>{item.role}</span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
