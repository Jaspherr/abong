import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSearchListings } from "@/features/listings/queries"
import { pluralize } from "@/lib/format"
import type { SearchFilters } from "@/types"
import { FiltersPanel } from "./filters-panel"
import { countRefinements } from "./search-params"

/**
 * Centered, accessible filters modal.
 * Changes stay in a draft until the renter selects “Show places”.
 * Closing the dialog without applying discards the draft.
 */
export function FiltersSheet({
  filters,
  onApply,
}: {
  filters: SearchFilters
  onApply: (next: SearchFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<SearchFilters>(filters)

  // Keep the existing live results preview, without applying draft changes.
  const preview = useSearchListings(open ? draft : filters)
  const appliedCount = countRefinements(filters)
  const draftCount = countRefinements(draft)

  // Search text, location, proximity and sorting are not refinements.
  const clearRefinements: SearchFilters = {
    q: filters.q,
    location: filters.location,
    near: filters.near,
    sort: filters.sort,
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters)
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="relative shrink-0 gap-2 rounded-lg border-border/80 px-4 font-medium shadow-none hover:bg-muted/60"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {appliedCount > 0 && (
            <span className="flex min-w-5 items-center justify-center rounded-md bg-foreground px-1.5 py-0.5 text-caption font-semibold leading-none text-background tabular-nums">
              {appliedCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-background p-0 shadow-xl sm:max-w-[660px]"
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/70 px-6 py-6 pr-14 text-left sm:px-8 sm:py-7 sm:pr-14">
          <DialogTitle className="font-display text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-[1.75rem]">
            Refine your search
          </DialogTitle>
          <DialogDescription className="max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
            Find the right place by narrowing your budget, room preferences, and house rules.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6">
          <FiltersPanel
            value={draft}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-background px-5 py-4 sm:px-8 sm:py-5">
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setDraft(clearRefinements)}
            disabled={draftCount === 0}
          >
            Clear all
          </Button>
          <Button
            type="button"
            className="min-w-0 flex-1 rounded-lg px-5 sm:min-w-44 sm:flex-none"
            onClick={() => {
              onApply(draft)
              setOpen(false)
            }}
          >
            {preview.isFetching
              ? "Counting…"
              : `Show ${pluralize(preview.data?.total ?? 0, "place")}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
