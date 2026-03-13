import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useAppStore } from "../../store/useAppStore"
import { useAuthStore } from "../../store/useAuthStore"
import { formatCurrency, formatDuration } from "../../utils/formatters"
import { api } from "../../utils/api"
import UpgradeRequiredModal from "../../components/common/UpgradeRequiredModal"
import { canAccessBranchesPlan, getPlan, isPaidPlan } from "../../utils/plans"
import { validateRequiredText } from "../../utils/validation"

const EMPTY_FORM = { name: "", description: "", image: "", imagePublicId: "", price: "", durationValue: "", durationUnit: "mins", active: true }
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_IMAGE_DIMENSION = 1400

const resizeImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the selected image."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("Could not process the selected image."))
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Image processing is not supported in this browser."))
          return
        }
        context.drawImage(image, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not prepare the selected image."))
              return
            }
            resolve(blob)
          },
          "image/jpeg",
          0.82,
        )
      }
      image.src = String(reader.result || "")
    }
    reader.readAsDataURL(file)
  })

const toFormDuration = (duration) => {
  const minutes = Number(duration || 0)
  if (Number.isFinite(minutes) && minutes > 0 && minutes % 60 === 0) {
    return { durationValue: String(minutes / 60), durationUnit: "hours" }
  }
  return { durationValue: minutes > 0 ? String(minutes) : "", durationUnit: "mins" }
}

const toStoredDuration = ({ durationValue, durationUnit }) => {
  const value = Number(durationValue || 0)
  if (!Number.isFinite(value) || value < 0) return 0
  return durationUnit === "hours" ? value * 60 : value
}

export default function ServicesPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const services = useAppStore((state) => state.services)
  const branches = useAppStore((state) => state.branches)
  const selectedBranchId = useAppStore((state) => state.selectedBranchId)
  const setServices = useAppStore((state) => state.setServices)
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: "" })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [error, setError] = useState("")
  const [imageError, setImageError] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const business = useAppStore((state) => state.business)
  const subscription = business?.subscription || { plan: "free" }
  const plan = getPlan(subscription.plan)
  const role = String(user?.role || "owner").toLowerCase()
  const branchAccessEnabled = business?.hasBranches === true && canAccessBranchesPlan(subscription.plan)
  const branchScopeId = role === "owner" || role === "admin" ? selectedBranchId : user?.branchId || ""
  const canChooseBranch = branchAccessEnabled && (role === "owner" || role === "admin")
  const canManageServices = role === "owner" || role === "admin"
  const branchNameById = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])), [branches])

  const editing = useMemo(
    () => services.find((service) => service.id === editingId) || null,
    [services, editingId],
  )

  const onServiceImageFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !token) return
    event.target.value = ""
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Upload a JPG, PNG, or WEBP image.")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be 2MB or smaller.")
      return
    }
    setImageError("")
    setUploadingImage(true)
    try {
      const compressedFile = await resizeImageFile(file)
      const uploaded = await api.uploadServiceImage(
        token,
        compressedFile,
        file.name.replace(/\.[^.]+$/, "") + ".jpg",
      )
      setForm((prev) => ({
        ...prev,
        image: String(uploaded.url || ""),
        imagePublicId: String(uploaded.publicId || ""),
      }))
    } catch (uploadError) {
      setImageError(uploadError.message || "Could not upload image.")
    } finally {
      setUploadingImage(false)
    }
  }

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, branchId: branchScopeId || "" })
    setEditingId(null)
    setError("")
    setImageError("")
  }

  const syncServices = async () => {
    if (!token) return
    const next = await api.getServices(token, { branchId: branchScopeId })
    setServices(next)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    const requiredError = validateRequiredText(form.name, "Service name")
    if (requiredError) {
      setError(requiredError)
      return
    }
    if (!editingId && !isPaidPlan(subscription.plan) && services.length >= plan.limits.services) {
      setError("")
      setShowUpgrade(true)
      return
    }
    setLoading(true)
    try {
      setError("")
      const payload = {
        name: form.name,
        description: form.description,
        image: form.image,
        imagePublicId: form.imagePublicId,
        branchId: canChooseBranch ? form.branchId || null : branchScopeId || null,
        price: Number(form.price || 0),
        duration: toStoredDuration(form),
        active: form.active,
      }
      if (editingId) {
        await api.updateService(token, editingId, payload)
      } else {
        await api.addService(token, payload)
      }
      await syncServices()
      resetForm()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!token) return
    await api.deleteService(token, id)
    await syncServices()
  }

  const startEdit = (service) => {
    setEditingId(service.id)
    setImageError("")
    setForm({
      name: service.name || "",
      description: service.description || "",
      image: service.image || "",
      imagePublicId: service.imagePublicId || "",
      branchId: service.branchId || "",
      price: String(service.price ?? ""),
      ...toFormDuration(service.duration),
      active: Boolean(service.active),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Services</p>
        <h1 className="text-3xl font-semibold">Manage business services</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {services.length === 0 && (
            <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-sm text-ink-700/70 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-pearl-100/70">
              No services found. Add your first service to get started.
            </div>
          )}
          {services.map((service) => (
            <motion.div
              key={service.id}
              className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{service.name}</div>
                  <div className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">
                    {formatCurrency(Number(service.price || 0))} | {formatDuration(service.duration)}
                  </div>
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.name}
                      className="mt-3 h-32 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  {service.description ? (
                    <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">{service.description}</p>
                  ) : null}
                  {branchAccessEnabled ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                      Branch: {service.branchId ? branchNameById[service.branchId] || "Assigned branch" : "All branches"}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {canManageServices ? (
                    <>
                      <button
                        className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                        onClick={() => startEdit(service)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-rose-500"
                        onClick={() => handleDelete(service.id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <form
          className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          onSubmit={handleSubmit}
        >
          <div className="text-sm font-semibold">{editing ? "Edit service" : "Add service"}</div>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
            {canManageServices
              ? "Keep pricing, duration, and branch assignment accurate for online booking."
              : "Managers can review services here, but only owners and admins can add or change them."}
          </p>
          <div className={`mt-4 space-y-3 ${canManageServices ? "" : "pointer-events-none opacity-60"}`}>
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Service name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <textarea
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Service description"
              rows="3"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
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
            <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3 dark:bg-white/5">
              <div className="text-xs uppercase tracking-[0.2em] text-ink-700/60 dark:text-pearl-100/60">
                Service image
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-soft transition hover:bg-emerald-600">
                {uploadingImage ? "Processing..." : "Upload image"}
                <input className="hidden" type="file" accept="image/*" onChange={onServiceImageFile} />
              </label>
              {form.image ? (
                <button
                  type="button"
                  className="ml-3 rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, image: "", imagePublicId: "" }))
                    setImageError("")
                  }}
                >
                  Remove image
                </button>
              ) : null}
              <p className="mt-2 text-xs text-ink-700/60 dark:text-pearl-100/60">
                JPG, PNG, or WEBP only. Max 2MB. Large images are compressed automatically.
              </p>
              {imageError ? <p className="mt-2 text-sm text-rose-500">{imageError}</p> : null}
            </div>
            <input
              className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
              placeholder="Price"
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                className="w-full rounded-2xl border border-white/40 px-3 py-2 text-sm"
                placeholder={form.durationUnit === "hours" ? "Duration" : "Duration"}
                type="number"
                min="0"
                step={form.durationUnit === "hours" ? "0.5" : "1"}
                value={form.durationValue}
                onChange={(event) => setForm({ ...form, durationValue: event.target.value })}
              />
              <select
                className="rounded-2xl border border-white/40 px-3 py-2 text-sm"
                value={form.durationUnit}
                onChange={(event) => setForm({ ...form, durationUnit: event.target.value })}
              >
                <option value="mins">mins</option>
                <option value="hours">hours</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Active
            </label>
            {form.image ? (
              <div className="overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
                <img src={form.image} alt={form.name || "Service preview"} className="h-36 w-full object-cover" />
              </div>
            ) : null}
            <button className="lux-button-primary w-full" disabled={loading || uploadingImage}>
              {loading ? "Saving..." : uploadingImage ? "Processing image..." : editing ? "Update service" : "Add service"}
            </button>
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            {editing && (
              <button
                type="button"
                className="lux-button-secondary w-full"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>
      <UpgradeRequiredModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Upgrade to add more services"
        description="The Free plan is limited to 3 services. Upgrade to Growth or Pro to unlock unlimited services."
      />
    </div>
  )
}

