import { BadgeCheck, X } from "lucide-react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { PATHS } from "@/constants/app"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { formatPeso } from "@/lib/format"
import type { Listing } from "@/types"
import { availabilitySummary, distanceLine, locationLabel, priceUnit, typeLabel } from "./listing-utils"

/** Horizontal card used over the mobile map when a marker is selected. */
export function ListingMiniCard({ listing, onClose }: { listing: Listing; onClose?: () => void }) {
  const distance = distanceLine(listing)
  return (
    <article className="relative flex gap-3 rounded-2xl bg-card p-2.5 shadow-raised">
      <Photo src={listing.photos[0]?.src} alt={listing.photos[0]?.alt ?? listing.name} className="aspect-square w-28 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5 pr-8">
        <p className="truncate text-xs text-muted-foreground">
          {typeLabel(listing)} in {locationLabel(listing)}
        </p>
        <h3 className="flex items-center gap-1 font-heading leading-snug font-semibold">
          <Link to={PATHS.listing(listing.id)} className="truncate after:absolute after:inset-0 after:rounded-2xl">
            {listing.name}
          </Link>
          {listing.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />}
        </h3>
        {distance && <p className="truncate text-xs text-muted-foreground">{distance.text}</p>}
        <p className="mt-auto flex items-baseline justify-between gap-2 tabular">
          <span>
            <span className="font-display">{formatPeso(listing.priceFrom)}</span>
            <span className="text-xs text-muted-foreground"> {priceUnit(listing.pricingBasis)}</span>
          </span>
          <span className="truncate text-xs font-semibold text-success">{availabilitySummary(listing).text}</span>
        </p>
      </div>
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close preview"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        <FavoriteButton listingId={listing.id} name={listing.name} className="size-7 shadow-none" />
      </div>
    </article>
  )
}
