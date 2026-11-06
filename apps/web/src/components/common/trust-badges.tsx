import { BadgeCheck, CalendarCheck } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatRelative, isAvailabilityStale } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A quiet label, not a pill: a small check and the word. Pass a surface class when it sits on a photo. */
export function VerifiedBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm font-semibold text-foreground",
            size === "sm" ? "text-xs" : "text-meta",
            className,
          )}
        >
          <BadgeCheck className={cn("text-primary", size === "sm" ? "size-3.5" : "size-4")} aria-hidden="true" />
          Verified
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-pretty">
        Landlord identity and property documents were checked by the Abong team.
      </TooltipContent>
    </Tooltip>
  )
}

/** Freshness signal — renters care whether "available" is still true. */
export function AvailabilityConfirmed({ at, className }: { at: string; className?: string }) {
  const stale = isAvailabilityStale(at)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        stale ? "text-warning" : "text-muted-foreground",
        className,
      )}
    >
      <CalendarCheck className="size-3.5" aria-hidden="true" />
      {stale ? "Availability not confirmed recently" : `Availability confirmed ${formatRelative(at)}`}
    </span>
  )
}
