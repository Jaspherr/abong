import { cn } from "@/lib/utils"

/** Beds taken vs capacity. One segment per bed for small rooms, a plain bar for large ones. */
export function OccupancyBar({ occupied, capacity, className }: { occupied: number; capacity: number; className?: string }) {
  const label = `${occupied} of ${capacity} ${capacity === 1 ? "occupant" : "beds"} taken`
  if (capacity <= 8) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex gap-0.5" role="img" aria-label={label}>
          {Array.from({ length: capacity }, (_, i) => (
            <span key={i} className={cn("h-1.5 w-2.5 rounded-full sm:w-3.5", i < occupied ? "bg-ink/70" : "bg-success/35")} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular">
          {occupied}/{capacity}
        </span>
      </div>
    )
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-success/35" role="img" aria-label={label}>
        <div className="h-full rounded-full bg-ink/70" style={{ width: `${(occupied / capacity) * 100}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular">
        {occupied}/{capacity}
      </span>
    </div>
  )
}
