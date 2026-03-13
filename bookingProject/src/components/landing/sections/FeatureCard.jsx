import { motion } from "framer-motion"
import { Card } from "../LandingUI"

const previews = {
  calendar: { headline: "Smart availability" },
  payments: { headline: "Deposit secured" },
  messages: { headline: "SMS reminder" },
  staff: { headline: "Team sync" },
  analytics: { headline: "Revenue lift" },
  crm: { headline: "VIP profile" },
  dashboard: { headline: "Trend radar" },
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const monthCells = ["", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", ""]

function PreviewContent({ type }) {
  if (type === "calendar") {
    return (
      <div>
        <div className="mb-2.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-subdued">
          <span>September 2026</span>
          <span>18 bookings</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-[0.16em] text-subdued">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {monthCells.map((cell, index) => (
            <motion.div
              key={`cal-${cell || index}`}
              className={`flex h-7 items-center justify-center rounded-md border text-[10px] ${
                !cell
                  ? "border-transparent bg-transparent"
                  : cell === "11" || cell === "18" || cell === "24"
                    ? "border-primary-500/45 bg-primary-500/20 font-semibold text-primary-700"
                    : "border-border bg-surface text-subdued"
              }`}
              animate={cell ? { y: [0, -1, 0] } : undefined}
              transition={cell ? { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.02 } : undefined}
            >
              {cell}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "payments") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-xs">
          <span className="text-body">Deposit request</span>
          <span className="font-semibold text-primary-700">$120</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-royal-500"
            animate={{ width: ["35%", "82%", "55%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Visa", "Stripe", "Bank"].map((item) => (
            <div key={item} className="rounded-md border border-border bg-surface py-2 text-center text-[10px] uppercase tracking-[0.16em] text-subdued">
              {item}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "messages") {
    return (
      <div className="relative">
        <div className="rounded-lg border border-border bg-surface p-3.5 text-xs">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-subdued">
            <span>SMS</span>
            <span>Sent</span>
          </div>
          <p className="mt-2 text-sm text-body">Hi Maya, your 6:30pm appointment is confirmed. Reply YES to keep it.</p>
        </div>
        <motion.div
          className="absolute -right-2 -top-3 rounded-full border border-primary-500/40 bg-primary-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-primary-700"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut" }}
        >
          Live
        </motion.div>
      </div>
    )
  }

  if (type === "staff") {
    return (
      <div className="space-y-3">
        {["Ava Park", "Mason Lee", "Riya Patel"].map((name, index) => (
          <motion.div
            key={name}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 }}
          >
            <span className="text-body">{name}</span>
            <span className="text-primary-700">Available</span>
          </motion.div>
        ))}
      </div>
    )
  }

  if (type === "analytics") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-subdued">
          <span>Insights</span>
          <span>This week</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["No-shows", "2.1%"],
            ["Repeat rate", "67%"],
            ["Avg ticket", "$82"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-surface px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-[0.14em] text-subdued">{label}</div>
              <div className="mt-1 text-sm font-semibold text-strong">{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            ["Peak hours", "6pm - 8pm", "w-[76%]"],
            ["Top service", "Classic facial", "w-[62%]"],
          ].map(([label, value, width], index) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-subdued">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r from-primary-500 to-royal-500 ${width}`}
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "dashboard") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-subdued">
          <span>Dashboard</span>
          <span>30 days</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Bookings", "184"],
            ["Revenue", "$6.8k"],
            ["Growth", "+12%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-surface px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-[0.14em] text-subdued">{label}</div>
              <div className="mt-1 text-sm font-semibold text-strong">{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-subdued">
            <span>Weekly trend</span>
            <span>Mon-Sun</span>
          </div>
          <div className="flex h-20 items-end gap-2">
            {["h-8", "h-10", "h-7", "h-14", "h-12", "h-16", "h-11"].map((height, index) => (
              <motion.div
                key={`${height}-${index}`}
                className={`w-full rounded-t-md bg-gradient-to-t from-primary-500 to-royal-500 ${height}`}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500/65 to-royal-500/60" />
          <div>
            <div className="text-sm font-semibold text-strong">Selene Carter</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-subdued">VIP Client</div>
          </div>
        </div>
        <span className="rounded-full border border-primary-500/35 bg-primary-500/12 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-primary-700">
          Priority
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Visits 12", "Spend $2.4k", "Prefers AM", "Notes saved"].map((item) => (
          <div key={item} className="rounded-md border border-border bg-surface px-2 py-2 text-[10px] uppercase tracking-[0.16em] text-subdued">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FeatureCard({
  title,
  benefit,
  description,
  accent,
  preview,
  index,
  meta = [],
  kpi,
}) {
  const data = previews[preview]
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.2, 0.65, 0.3, 1] }}
    >
      <Card className="group relative h-full overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-6">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-45`} />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-white/95 px-3 py-2.5 text-xs uppercase tracking-[0.22em] text-subdued">
            {data.headline}
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-3 min-h-[190px] sm:min-h-[210px]">
            <div className="opacity-90">
              <PreviewContent type={preview} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.map((item) => (
              <span key={item} className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-subdued">
                {item}
              </span>
            ))}
          </div>
          {kpi ? <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-body">{kpi}</div> : null}
          <div>
            <h3 className="text-xl font-semibold tracking-[0.01em] text-strong">{title}</h3>
            <p className="mt-1 text-sm font-medium text-primary-700">{benefit}</p>
            <p className="mt-1.5 text-sm leading-6 text-body">{description}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

