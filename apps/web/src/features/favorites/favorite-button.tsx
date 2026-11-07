import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavoriteIds, useToggleFavorite } from "./use-favorites"

export function FavoriteButton({
  listingId,
  name,
  variant = "overlay",
  className,
}: {
  listingId: string
  name: string
  variant?: "overlay" | "inline"
  className?: string
}) {
  const saved = useFavoriteIds().has(listingId)
  const toggle = useToggleFavorite()

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle.mutate({ listingId, name })
      }}
      className={cn(
        "group/fav inline-flex items-center justify-center gap-2 transition-[scale,background-color,border-color] motion-safe:active:scale-95",
        variant === "overlay"
          ? "size-9 rounded-full bg-card/95 pointer-coarse:size-10 text-ink shadow-[0_1px_2px_rgb(23_25_28/0.18)] hover:bg-card"
          : "h-10 rounded-lg border border-ink/20 bg-card px-3.5 text-sm font-semibold hover:border-ink/35",
        className,
      )}
    >
      {/* Remounting on change replays the save pop when a place is saved. */}
      <Heart
        key={saved ? "saved" : "unsaved"}
        aria-hidden="true"
        className={cn(
          "size-4.5 transition-colors",
          saved ? "animate-save fill-primary stroke-primary" : "group-hover/fav:stroke-primary",
        )}
      />
      {variant === "inline" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  )
}
