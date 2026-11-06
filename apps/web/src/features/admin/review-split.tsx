import type { ReactNode } from "react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useIsDesktop } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

/**
 * Queue beside the open item from lg up, so reviewing never leaves the list. The two panes fill the
 * screen and scroll separately, so opening an item far down a long queue still shows it.
 * Below lg, the item opens in a sheet.
 */
export function ReviewSplit({
  label,
  itemId,
  queue,
  detail,
  open,
  onClose,
}: {
  label: string
  /** The open item. A new one starts its pane back at the top. */
  itemId: string | null
  queue: ReactNode
  detail: ReactNode
  /** Whether an item is selected, which opens the sheet on small screens. */
  open: boolean
  onClose: () => void
}) {
  const split = useIsDesktop()

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[max(26rem,calc(100svh-var(--header-height)-15rem))] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <div className="relative min-w-0 self-start overflow-hidden rounded-xl border border-border bg-card lg:max-h-full lg:overflow-y-auto lg:overscroll-contain">{queue}</div>
      {split ? (
        <section key={itemId ?? "none"} aria-label={label} className="relative min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card">
          {detail}
        </section>
      ) : (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
          <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
            <SheetTitle className="sr-only">{label}</SheetTitle>
            <SheetDescription className="sr-only">Details and decisions for the selected item</SheetDescription>
            <div className="min-h-0 flex-1 overflow-y-auto">{detail}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

/** The fact list used in every review: label on the left, value on the right. */
export function FactList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm [&_dt]:text-muted-foreground", className)}>{children}</dl>
}

/** The decision area stays in view while the details above it scroll. */
export function DecisionBar({ children }: { children: ReactNode }) {
  return <div className="z-10 space-y-3 border-t border-border bg-card p-4 lg:sticky lg:bottom-0">{children}</div>
}
