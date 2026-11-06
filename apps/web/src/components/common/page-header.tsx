import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
  size = "default",
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  size?: "default" | "large"
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1
          className={cn(
            size === "large" ? "type-display" : "type-page-title",
          )}
        >
          {title}
        </h1>
        {description && <p className="max-w-prose text-body text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  className,
  as: Tag = "h2",
  size = "default",
  titleId,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  as?: "h2" | "h3"
  /** "large" is for marketing pages, where a section opens with a display-size heading. */
  size?: "default" | "large"
  /** Lets the surrounding section point `aria-labelledby` at the heading. */
  titleId?: string
}) {
  const titleClass = size === "large" ? "type-display" : Tag === "h2" ? "type-section-title" : "type-card-title"

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="max-w-2xl space-y-1.5">
        <Tag id={titleId} className={titleClass}>{title}</Tag>
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
