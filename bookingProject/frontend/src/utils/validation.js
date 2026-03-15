export const validateRequiredText = (value, label) => {
  if (!String(value || "").trim()) return `${label} is required.`
  return ""
}

