function cx(...classes) {
  return classes.filter(Boolean).join(" ")
}

const sectionStyles = {
  page: "bg-page dark:bg-ink-950",
  surface: "bg-surface dark:bg-ink-900",
  muted: "bg-muted dark:bg-ink-900",
  contrast: "bg-contrast text-pearl-100",
}

const buttonStyles = {
  primary: "lux-button-primary",
  secondary: "lux-button-secondary",
  ghost:
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-subdued transition hover:text-strong dark:text-pearl-100/75 dark:hover:text-pearl-100",
}

export function Section({ id, tone = "page", roomy = false, className = "", children }) {
  return (
    <section id={id} className={cx(roomy ? "section-shell-lg" : "section-shell", sectionStyles[tone], className)}>
      <div className="section-container">{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  copy,
  className = "",
  invert = false,
  titleClassName = "",
  copyClassName = "",
}) {
  return (
    <div className={cx("section-heading", className)}>
      {eyebrow ? (
        <p className={cx("section-eyebrow", invert && "text-white")}>{eyebrow}</p>
      ) : null}
      <h2 className={cx("section-title", invert && "text-white", titleClassName)}>{title}</h2>
      {copy ? (
        <p className={cx("section-copy", invert && "text-white", copyClassName)}>{copy}</p>
      ) : null}
    </div>
  )
}

export function Card({ className = "", children }) {
  return <div className={cx("surface-card", className)}>{children}</div>
}

export function Button({ variant = "primary", className = "", as: Tag = "button", ...props }) {
  return <Tag className={cx(buttonStyles[variant], className)} {...props} />
}

