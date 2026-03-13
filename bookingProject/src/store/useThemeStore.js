import { create } from "zustand"

const THEME_KEY = "luxTheme"

const getInitialTheme = () => {
  if (typeof window === "undefined") return false
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === "dark") return true
    if (saved === "light") return false
  } catch {
    // Ignore storage failures and use system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

const applyTheme = (enabled) => {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", enabled)
  document.body.classList.toggle("dark", enabled)
  document.documentElement.style.colorScheme = enabled ? "dark" : "light"
  try {
    localStorage.setItem(THEME_KEY, enabled ? "dark" : "light")
  } catch {
    // Ignore storage failures.
  }
}

export const initializeTheme = () => {
  const enabled = getInitialTheme()
  applyTheme(enabled)
  return enabled
}

export const useThemeStore = create((set, get) => ({
  enabled: getInitialTheme(),
  setEnabled: (enabled) => {
    applyTheme(enabled)
    set({ enabled })
  },
  toggle: () => {
    const current = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : get().enabled
    const next = !current
    applyTheme(next)
    set({ enabled: next })
  },
}))
