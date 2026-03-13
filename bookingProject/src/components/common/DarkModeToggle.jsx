import { Moon, Sun } from "lucide-react"
import { useThemeStore } from "../../store/useThemeStore"

export default function DarkModeToggle() {
  const enabled = useThemeStore((state) => state.enabled)
  const toggle = useThemeStore((state) => state.toggle)

  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-subdued shadow-sm transition duration-200 ease-out hover:bg-muted hover:text-strong hover:shadow-md dark:border-white/15 dark:bg-white/5 dark:text-pearl-100/70 dark:hover:bg-white/10 dark:hover:text-pearl-100"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      type="button"
    >
      {enabled ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

