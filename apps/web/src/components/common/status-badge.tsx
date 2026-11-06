import type { ReactNode } from "react"
import type { Tone } from "@/constants/status"
import { cn } from "@/lib/utils"

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
  brand: "bg-secondary text-secondary-foreground",
}

/**
 * Status is a mark as well as a colour: settled states get a filled mark,
 * states still in progress get a hollow ring, neutral gets a short dash.
 */
const MARK_CLASSES: Record<Tone, string> = {
  neutral: "h-0.5 w-2 rounded-none bg-muted-foreground/70",
  success: "size-1.5 rounded-full bg-success",
  warning: "size-2 rounded-full border-[1.5px] border-warning",
  danger: "size-1.5 rounded-[1px] bg-destructive",
  info: "size-2 rounded-full border-[1.5px] border-info",
  brand: "size-1.5 rounded-full bg-primary",
}

export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-meta leading-none font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className={cn("shrink-0", MARK_CLASSES[tone])} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Renders any `{ label, tone }` lookup entry, e.g. `<MetaBadge meta={LISTING_STATUS[status]} />`. */
export function MetaBadge({ meta, className }: { meta: { label: string; tone: Tone }; className?: string }) {
  return (
    <StatusBadge tone={meta.tone} className={className}>
      {meta.label}
    </StatusBadge>
  )
}
