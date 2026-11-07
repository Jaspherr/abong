import { BadgeCheck, CalendarClock, Footprints } from "lucide-react"
import { Link } from "react-router"

import { Photo } from "@/components/common/photo"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import {
  amenityPreview,
  amenityShort,
  AVAILABILITY_TONE,
  availabilitySummary,
  distanceLine,
  locationLabel,
  moveInEstimate,
  priceUnit,
  priceUnitLong,
  typeLabel,
} from "@/features/listings/listing-utils"
import { formatDate, formatPeso, isAvailabilityStale, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Listing } from "@/types"

/** The whole article is the link; the heart sits above this layer. */
const stretchedLink =
  "outline-none after:absolute after:inset-0 after:z-10 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"

function moveInBreakdown({ advanceMonths, depositMonths }: Listing["terms"]) {
  if (advanceMonths === 0 && depositMonths === 0) return "No advance or deposit"
  const advance = advanceMonths > 0 ? `${pluralize(advanceMonths, "month")} advance` : "No advance"
  const deposit = depositMonths > 0 ? `${pluralize(depositMonths, "month")} deposit` : "no deposit"
  return `${advance}, ${deposit}`
}

function DistanceLine({ listing }: { listing: Listing }) {
  const distance = distanceLine(listing)
  if (!distance) return null

  return (
    <p className="flex min-w-0 items-start gap-1.5 text-meta text-foreground/75">
      <Footprints className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0">
        {distance.text}
        {distance.walk && (
          <span className="text-muted-foreground" title="Estimated from straight-line distance">
            , about {distance.walk} min walk
          </span>
        )}
      </span>
    </p>
  )
}

/** What's open, and when the landlord last said so. */
function AvailabilityLine({ listing }: { listing: Listing }) {
  const availability = availabilitySummary(listing)
  const tone = AVAILABILITY_TONE[availability.tone]
  const stale = isAvailabilityStale(listing.availabilityConfirmedAt)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
      <span className={cn("inline-flex items-center gap-1.5 font-semibold", tone.text)}>
        <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
        {availability.text}
      </span>
      <span
        className={cn("inline-flex items-center gap-1.5", stale ? "font-medium text-warning" : "text-muted-foreground")}
        title="When the landlord last confirmed availability"
      >
        <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        {stale ? "Not confirmed recently" : `Confirmed ${formatDate(listing.availabilityConfirmedAt, "MMM d")}`}
      </span>
    </div>
  )
}

/** The one listing given room: a clean photo, then rent and move-in money side by side. */
export function FeaturedLead({ listing }: { listing: Listing }) {
  const moveIn = moveInEstimate(listing)
  const amenities = amenityPreview(listing)
  const titleId = `featured-${listing.id}-title`

  return (
    <article aria-labelledby={titleId} className="group relative isolate min-w-0">
      <div className="relative">
        <Photo
          src={listing.photos[0]?.src}
          alt={listing.photos[0]?.alt ?? listing.name}
          className="aspect-[4/3] w-full rounded-2xl sm:aspect-video lg:aspect-[16/10]"
          hoverZoom
        />
        {listing.isVerified && (
          <span className="absolute top-3 left-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-card px-3 text-caption font-semibold text-foreground shadow-card sm:top-4 sm:left-4">
            <BadgeCheck className="size-3.5 text-primary" strokeWidth={2.2} aria-hidden="true" />
            Verified
          </span>
        )}
        <FavoriteButton
          listingId={listing.id}
          name={listing.name}
          className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4"
        />
      </div>

      <h3 id={titleId} className="mt-5 type-section-title text-balance transition-colors group-hover:text-primary">
        <Link to={PATHS.listing(listing.id)} className={cn(stretchedLink, "after:rounded-2xl")}>
          {listing.name}
        </Link>
      </h3>
      <p className="mt-1.5 text-body text-muted-foreground">
        {typeLabel(listing)} in {locationLabel(listing)}
      </p>

      <dl className="mt-4 grid grid-cols-2 border-y border-border">
        <div className="min-w-0 py-4 pr-4">
          <dt className="text-meta text-muted-foreground">
            {listing.priceTo > listing.priceFrom ? "Rent from" : "Rent"}
          </dt>
          <dd className="mt-1.5 font-display text-metric">{formatPeso(listing.priceFrom)}</dd>
          <dd className="mt-1 text-caption text-muted-foreground">{priceUnitLong(listing.pricingBasis)}</dd>
        </div>
        <div className="min-w-0 border-l border-border py-4 pl-4 sm:pl-6">
          <dt className="text-meta text-muted-foreground">Move-in estimate</dt>
          <dd className="mt-1.5 font-display text-metric">{formatPeso(moveIn.total)}</dd>
          <dd className="mt-1 text-caption text-muted-foreground">{moveInBreakdown(listing.terms)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <DistanceLine listing={listing} />
        {amenities.length > 0 && (
          <p className="text-meta text-muted-foreground">{amenities.map(amenityShort).join(", ")}</p>
        )}
        <AvailabilityLine listing={listing} />
      </div>
    </article>
  )
}

/** A compact row, so several places can be compared without scrolling past big photos. */
export function FeaturedRow({ listing }: { listing: Listing }) {
  const moveIn = moveInEstimate(listing)
  const titleId = `featured-${listing.id}-title`

  return (
    <article
      aria-labelledby={titleId}
      className="group relative isolate grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:gap-x-5 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-x-4 xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-x-5"
    >
      <div className="relative aspect-square self-start sm:row-span-2 sm:aspect-auto sm:h-full sm:min-h-40 sm:self-stretch">
        <Photo
          src={listing.photos[0]?.src}
          alt={listing.photos[0]?.alt ?? listing.name}
          className="absolute inset-0 rounded-xl"
          hoverZoom
        />
        <FavoriteButton listingId={listing.id} name={listing.name} className="absolute top-1.5 right-1.5 z-20" />
      </div>

      <div className="min-w-0">
        <h3 id={titleId} className="flex items-start gap-1.5 type-card-title transition-colors group-hover:text-primary">
          <span className="line-clamp-2 min-w-0">
            <Link to={PATHS.listing(listing.id)} className={cn(stretchedLink, "after:rounded-xl")}>
              {listing.name}
            </Link>
          </span>
          {listing.isVerified && (
            <>
              <BadgeCheck className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" />
              <span className="sr-only">Verified</span>
            </>
          )}
        </h3>
        <p className="mt-0.5 text-meta text-muted-foreground">
          {typeLabel(listing)} in {locationLabel(listing)}
        </p>

        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display text-price">{formatPeso(listing.priceFrom)}</span>
          <span className="text-meta text-muted-foreground">{priceUnit(listing.pricingBasis)}</span>
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          Estimated{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatPeso(moveIn.total)}</span> to move in
        </p>

      </div>

      {/* Under the photo on phones, where the column beside it is too narrow to hold these on one line. */}
      <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1 sm:col-start-2">
        <DistanceLine listing={listing} />
        <AvailabilityLine listing={listing} />
      </div>
    </article>
  )
}

/** Holds the same shape as the loaded section, so nothing jumps when the data arrives. */
export function FeaturedSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14"
      role="status"
      aria-label="Loading featured places"
    >
      <div className="min-w-0 lg:col-span-7" aria-hidden="true">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-video lg:aspect-[16/10]" />
        <Skeleton className="mt-5 h-7 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
      <div className="min-w-0 divide-y divide-border lg:col-span-5 lg:grid lg:auto-rows-fr" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-5"
          >
            <Skeleton className="aspect-square rounded-xl sm:aspect-auto sm:min-h-40" />
            <div className="min-w-0 space-y-2.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
