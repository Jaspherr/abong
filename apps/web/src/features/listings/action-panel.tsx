import { CalendarCheck, Info, MessageSquare, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { InquiryDialog } from "@/features/inquiries/inquiry-dialog"
import { ViewingRequestDialog } from "@/features/viewings/viewing-request-dialog"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Listing } from "@/types"
import { availabilitySummary, moveInEstimate, priceUnit } from "./listing-utils"
import { shareListing } from "./share-listing"

const TONE = { open: "text-success", soon: "text-warning", full: "text-muted-foreground" } as const

/** Sticky desktop panel with the price and the two primary actions. */
export function ActionPanel({ listing }: { listing: Listing }) {
  const availability = availabilitySummary(listing)
  const full = availability.tone === "full"
  const moveIn = moveInEstimate(listing)
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(23_25_28/0.04),0_12px_32px_-16px_rgb(23_25_28/0.18)]">
      <div className="space-y-1">
        <p className="tabular">
          {listing.priceTo > listing.priceFrom && <span className="text-sm text-muted-foreground">from </span>}
          <span className="font-display text-4xl leading-none">{formatPeso(listing.priceFrom)}</span>
          <span className="text-muted-foreground"> {priceUnit(listing.pricingBasis)}</span>
        </p>
        <p className={cn("text-sm font-medium", TONE[availability.tone])}>{availability.text}</p>
      </div>
      <dl className="divide-y divide-border border-y border-border text-sm tabular">
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-muted-foreground">Advance</dt>
          <dd className="font-semibold">{formatPeso(moveIn.advance)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className="font-semibold">{formatPeso(moveIn.deposit)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2.5">
          <dt>
            <a href="#costs" className="font-semibold underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
              Move-in estimate
            </a>
          </dt>
          <dd className="font-display text-xl leading-none">{formatPeso(moveIn.total)}</dd>
        </div>
      </dl>
      <div className="grid gap-2">
        <InquiryDialog listing={listing}>
          <Button size="lg">
            <MessageSquare aria-hidden="true" />
            Message landlord
          </Button>
        </InquiryDialog>
        <ViewingRequestDialog listing={listing}>
          <Button size="lg" variant="outline" disabled={full}>
            <CalendarCheck aria-hidden="true" />
            Request a viewing
          </Button>
        </ViewingRequestDialog>
      </div>
      <div className="flex gap-2">
        <FavoriteButton listingId={listing.id} name={listing.name} variant="inline" className="flex-1" />
        <Button variant="outline" className="flex-1" onClick={() => shareListing(listing)}>
          <Share2 aria-hidden="true" />
          Share
        </Button>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Messaging and viewings are free. Pay advance and deposit only after you've seen the place and signed an agreement.
        </p>
      </div>
    </div>
  )
}

export function MobileActionBar({ listing }: { listing: Listing }) {
  const full = availabilitySummary(listing).tone === "full"
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(23_25_28/0.25)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 tabular">
          <span className="block leading-tight whitespace-nowrap">
            <span className="font-display text-xl">{formatPeso(listing.priceFrom)}</span>
            <span className="text-xs text-muted-foreground"> {priceUnit(listing.pricingBasis)}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">About {formatPeso(moveInEstimate(listing).total)} to move in</span>
        </p>
        <ViewingRequestDialog listing={listing}>
          <Button variant="outline" disabled={full} aria-label="Request a viewing" className="px-3 min-[400px]:px-4">
            <CalendarCheck aria-hidden="true" className="hidden min-[360px]:block" />
            Viewing
          </Button>
        </ViewingRequestDialog>
        <InquiryDialog listing={listing}>
          <Button className="px-3 min-[400px]:px-4">
            <MessageSquare aria-hidden="true" className="hidden min-[360px]:block" />
            Message
          </Button>
        </InquiryDialog>
      </div>
    </div>
  )
}
