export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)

export const formatDuration = (value) => {
  const duration = Number(value || 0)
  if (!Number.isFinite(duration) || duration <= 0) return "0 mins"
  if (duration % 60 === 0) {
    const hours = duration / 60
    return `${hours} ${hours === 1 ? "hr" : "hrs"}`
  }
  return `${duration} mins`
}

export const classNames = (...classes) => classes.filter(Boolean).join(" ")
