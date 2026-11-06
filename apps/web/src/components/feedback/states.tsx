import { AlertTriangle, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
  headingLevel = "h2",
}: {
  /** Use "h1" when the empty state is the whole page, "h3" when it sits under a section's own h2. */
  headingLevel?: "h1" | "h2" | "h3"
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  const Heading = headingLevel
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "gap-3 px-4 py-10" : "gap-4 px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div className="relative grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-6" aria-hidden="true" />
        <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-background bg-mango" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <Heading className="text-lg font-semibold">{title}</Heading>
        {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = "This section didn't load",
  description = "Check your connection, then try again.",
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-4 px-6 py-14 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <h2 className="type-card-title">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
