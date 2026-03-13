import { motion } from "framer-motion"

const panels = [
  { title: "Calendar view", tag: "Week mode", type: "calendar" },
  { title: "Appointment list", tag: "Today", type: "appointments" },
  { title: "Mobile booking", tag: "Client flow", type: "mobile" },
  { title: "Analytics", tag: "Revenue", type: "analytics" },
  { title: "Client profile", tag: "VIP", type: "profile" },
]

const weekDays = ["M", "T", "W", "T", "F", "S", "S"]
const monthCells = ["", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", ""]

function PanelPreview({ type }) {
  if (type === "calendar") {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-subdued">
          <span>Sept 2026</span>
          <span>18</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase tracking-[0.14em] text-subdued">
          {weekDays.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthCells.map((cell, index) => (
            <div
              key={`cal-${cell || index}`}
              className={`flex h-6 items-center justify-center rounded-md border text-[9px] ${
                !cell
                  ? "border-transparent bg-transparent"
                  : cell === "11" || cell === "18" || cell === "24"
                    ? "border-primary-500/40 bg-primary-500/20 font-semibold text-primary-700"
                    : "border-border bg-surface text-subdued"
              }`}
            >
              {cell}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "appointments") {
    return (
      <div className="space-y-2.5">
        {["10:30 AM", "12:00 PM", "4:45 PM"].map((time, index) => (
          <div key={time} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs">
            <span className="text-body">{time}</span>
            <span className={index === 1 ? "text-royal-600" : "text-primary-700"}>Confirmed</span>
          </div>
        ))}
      </div>
    )
  }

  if (type === "mobile") {
    return (
      <div className="space-y-2.5">
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-body">Client name</div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-body">Service selection</div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-body">Card details</div>
        <div className="h-1.5 w-2/3 rounded-full bg-primary-500/45" />
      </div>
    )
  }

  if (type === "analytics") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-subdued">
          <span>Performance</span>
          <span className="text-primary-700">Stable</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["No-shows", "2.1%"],
            ["Retention", "67%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-[0.14em] text-subdued">{label}</div>
              <div className="mt-1 text-sm font-semibold text-strong">{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            ["Peak hours", "w-[72%]"],
            ["Team usage", "w-[58%]"],
          ].map(([label, width], index) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-subdued">
                <span>{label}</span>
                <span>{index === 0 ? "6pm-8pm" : "83%"}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r from-primary-500 to-royal-500 ${width}`}
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500/60 to-royal-500/60" />
        <div>
          <div className="text-sm font-semibold text-strong">Selene Carter</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-subdued">VIP Client</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Visits 12", "Spend $2.4k", "Notes saved", "Prefers AM"].map((item) => (
          <div key={item} className="rounded-md border border-border bg-surface px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-subdued">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function PanelCard({ panel }) {
  return (
    <motion.div className="group relative w-[260px] overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:w-[300px] lg:w-[350px]" whileHover={{ y: -4 }}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-subdued">
        <span>{panel.title}</span>
        <span>{panel.tag}</span>
      </div>
      <motion.div
        className="mt-3.5 overflow-hidden rounded-xl border border-border bg-muted/45 p-3.5 transition duration-300 group-hover:scale-[1.02]"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PanelPreview type={panel.type} />
      </motion.div>
    </motion.div>
  )
}

export default function ActionCarousel() {
  return (
    <div className="relative">
      <div className="overflow-x-auto md:overflow-hidden">
        <div className="flex min-w-max gap-5 md:animate-marquee">
          {panels.map((panel) => (
            <PanelCard key={panel.title} panel={panel} />
          ))}
          {panels.map((panel) => (
            <PanelCard key={`${panel.title}-dup`} panel={panel} />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-muted via-muted/0 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-muted via-muted/0 to-transparent" />
    </div>
  )
}

