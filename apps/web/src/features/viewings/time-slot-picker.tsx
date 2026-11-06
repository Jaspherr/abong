import { VIEWING_TIME_SLOTS } from "@/constants/app"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function TimeSlotPicker({
  value,
  onChange,
  invalid,
  name = "time-slot",
}: {
  value?: string
  onChange: (value: string) => void
  invalid?: boolean
  name?: string
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-2" role="radiogroup" aria-invalid={invalid}>
      {VIEWING_TIME_SLOTS.map((slot) => {
        const checked = slot === value
        return (
          <label
            key={slot}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium tabular transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
              checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
              invalid && !checked && "border-destructive/50",
            )}
          >
            <input type="radio" name={name} value={slot} checked={checked} onChange={() => onChange(slot)} className="sr-only" />
            {formatTime(slot)}
          </label>
        )
      })}
    </div>
  )
}
