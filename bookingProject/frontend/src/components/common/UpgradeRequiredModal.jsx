import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"

export default function UpgradeRequiredModal({ open, onClose, title = "Upgrade required", description }) {
  const navigate = useNavigate()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6">
      <motion.div
        className="w-full max-w-lg rounded-[32px] border border-white/40 bg-white/95 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
      >
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
          {description || "This feature is available on paid plans. Upgrade to unlock it."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="lux-button-secondary" onClick={onClose}>
            Not now
          </button>
          <button
            className="lux-button-primary"
            onClick={() => navigate("/dashboard/billing")}
          >
            Upgrade
          </button>
        </div>
      </motion.div>
    </div>
  )
}

