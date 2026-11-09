import { Star } from "lucide-react"
import { useId, useState } from "react"
import { cn } from "@/lib/utils"

const STARS = [1, 2, 3, 4, 5] as const
const STAR_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"]

/** Read-only stars. The number is rounded to whole stars for the picture; say the exact value next to it. */
export function Stars({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value)
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className={cn("inline-flex shrink-0 items-center gap-0.5", className)}>
      {STARS.map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("size-3.5", n <= filled ? "fill-foreground text-foreground" : "fill-transparent text-foreground/25")}
          strokeWidth={1.6}
        />
      ))}
    </span>
  )
}

/**
 * Pick 1–5 stars. Built from native radio buttons, so arrow keys move between stars and
 * screen readers announce "3 stars, Good". With `optional`, a "Not part of my experience"
 * choice lets renters skip what they didn't experience instead of guessing.
 */
export function StarRatingInput({
  legend,
  hint,
  value,
  onChange,
  optional,
  error,
  size = "md",
}: {
  legend: string
  hint?: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  optional?: boolean
  error?: string
  size?: "md" | "lg"
}) {
  const name = useId()
  const hintId = useId()
  const errorId = useId()
  const [hover, setHover] = useState<number>()
  const shown = hover ?? value ?? 0
  const star = size === "lg" ? "size-8" : "size-6"

  return (
    <fieldset aria-describedby={cn(hint && hintId, error && errorId) || undefined} className="min-w-0">
      <legend className="text-meta font-semibold">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-0.5 text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center" onPointerLeave={() => setHover(undefined)}>
          {STARS.map((n) => (
            <label key={n} className="group/star relative cursor-pointer p-0.5" onPointerEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                aria-invalid={!!error || undefined}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}, {STAR_WORDS[n]}
              </span>
              <Star
                aria-hidden="true"
                strokeWidth={1.5}
                className={cn(
                  star,
                  "rounded-sm transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40",
                  n <= shown ? "fill-foreground text-foreground" : "fill-transparent text-foreground/30",
                )}
              />
            </label>
          ))}
        </div>
        <span className="min-w-16 text-meta text-muted-foreground" aria-hidden="true">
          {shown ? STAR_WORDS[shown] : ""}
        </span>
        {optional && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-meta text-muted-foreground">
            <input
              type="radio"
              name={name}
              value=""
              checked={value === undefined}
              onChange={() => onChange(undefined)}
              className="size-3.5 accent-primary"
            />
            Not part of my experience
          </label>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-meta text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
