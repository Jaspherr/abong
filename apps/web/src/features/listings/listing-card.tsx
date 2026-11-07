
import {
  BadgeCheck,
  CalendarClock,
  Footprints,
  MapPin,
} from "lucide-react"
import { Link } from "react-router"

import { Photo } from "@/components/common/photo"
import { PATHS } from "@/constants/app"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import {
  formatDate,
  formatPeso,
  isAvailabilityStale,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Listing } from "@/types"

import {
  amenityPreview,
  amenityShort,
  AVAILABILITY_TONE,
  availabilitySummary,
  distanceLine,
  locationLabel,
  priceUnit,
  typeLabel,
} from "./listing-utils"

interface ListingCardProps {
  listing: Listing
  active?: boolean
  priority?: boolean
  onHover?: (id: string | null) => void
  className?: string
}

export function ListingCard({
  listing,
  active,
  priority,
  onHover,
  className,
}: ListingCardProps) {
  const distance = distanceLine(listing)
  const availability = availabilitySummary(listing)
  const amenities = amenityPreview(listing)

  const staleCheck = isAvailabilityStale(
    listing.availabilityConfirmedAt,
  )

  const availabilityStyle =
    AVAILABILITY_TONE[availability.tone]

  const hasPriceRange =
    listing.priceTo > listing.priceFrom

  return (
    <article
      aria-labelledby={`listing-${listing.id}-title`}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative isolate flex h-full min-w-0 flex-col",
        "overflow-hidden rounded-2xl",
        "border border-border/70 bg-card",
        "transition-[box-shadow,border-color] duration-200",
        "hover:border-primary/30",
        "hover:shadow-raised",
        "focus-within:border-primary",
        active &&
          "border-primary ring-2 ring-primary/40 shadow-lg",
        className,
      )}
    >
      {/* ==========================================
          PROPERTY IMAGE
      ========================================== */}
      <div className="relative overflow-hidden bg-muted">

        <Photo
          src={listing.photos[0]?.src}
          alt={listing.photos[0]?.alt ?? listing.name}
          priority={priority}
          className="aspect-[4/3] w-full"
          hoverZoom
        />

        {/* Image gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20"
        />

        {/* Top badges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3.5 sm:p-4">

          {listing.isVerified ? (
            <div className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/95 px-3 py-1.5 text-caption font-semibold text-neutral-900 shadow-sm backdrop-blur-md">
              <BadgeCheck
                className="size-3.5 text-primary"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              Verified
            </div>
          ) : (
            <span aria-hidden="true" />
          )}

        </div>

        {/* Favorite button stays above the card link */}
        <FavoriteButton
          listingId={listing.id}
          name={listing.name}
          className="absolute right-3.5 top-3.5 z-30 sm:right-4 sm:top-4"
        />

        {/* Price overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">

          <div className="flex flex-wrap items-end justify-between gap-3">

            <div className="min-w-0">
              <span className="mb-1 block text-caption font-medium text-white/75">
                {hasPriceRange
                  ? "Starting from"
                  : "Rental price"}
              </span>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2rem]">
                  {formatPeso(listing.priceFrom)}
                </span>

                <span className="text-xs font-medium text-white/80">
                  {priceUnit(listing.pricingBasis)}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ==========================================
          CARD CONTENT
      ========================================== */}
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">

        {/* Category and availability */}
        <div className="mb-3 flex items-center justify-between gap-3">

          <span className="min-w-0 truncate text-caption font-semibold text-primary">
            {typeLabel(listing)}
          </span>

          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 text-caption font-semibold",
              availabilityStyle.text,
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                availabilityStyle.dot,
              )}
              aria-hidden="true"
            />
            {availability.text}
          </span>
        </div>

        {/* Property name */}
        <h3
          id={`listing-${listing.id}-title`}
          className="line-clamp-2 font-heading text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl"
        >
          <Link
            to={PATHS.listing(listing.id)}
            className={cn(
              "outline-none",
              "after:absolute after:inset-0 after:z-10",
              "after:rounded-2xl",
              "focus-visible:after:ring-2",
              "focus-visible:after:ring-inset",
              "focus-visible:after:ring-ring",
            )}
          >
            {listing.name}
          </Link>
        </h3>

        {/* Location */}
        <p className="mt-2 flex min-w-0 items-start gap-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
          <MapPin
            className="mt-0.5 size-3.5 shrink-0 text-primary/80"
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <span className="min-w-0 truncate">
            {locationLabel(listing)}
          </span>
        </p>

        {/* ==========================================
            DISTANCE AND AMENITIES
        ========================================== */}
        {(distance || amenities.length > 0) && (
          <div className="mt-4 space-y-2">

            {distance && (
              <p className="flex min-w-0 items-start gap-2 text-xs leading-5 text-foreground/75">
                <Footprints
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span className="min-w-0 truncate">
                  {distance.text}

                  {distance.walk && (
                    <span
                      className="text-muted-foreground"
                      title="Estimated from straight-line distance"
                    >
                      {" "}· About {distance.walk} min walk
                    </span>
                  )}
                </span>
              </p>
            )}

            {/* Amenity tags */}
            {amenities.length > 0 && (
              <div
                className="flex flex-wrap gap-1.5"
                aria-label="Property highlights"
              >
                {amenities.map((amenity, index) => (
                  <span
                    key={`${amenityShort(amenity)}-${index}`}
                    className={cn(
                      "inline-flex max-w-full items-center rounded-lg",
                      "border border-border/70 bg-muted/60",
                      "px-2.5 py-1.5",
                      "text-caption font-medium text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {amenityShort(amenity)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            VERIFICATION / AVAILABILITY FOOTER
        ========================================== */}
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 border-t border-border/70 pt-3.5">

            <CalendarClock
              className={cn(
                "size-3.5 shrink-0",
                staleCheck
                  ? "text-warning"
                  : "text-muted-foreground",
              )}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <p
              className={cn(
                "min-w-0 truncate text-caption leading-5",
                staleCheck
                  ? "font-medium text-warning"
                  : "text-muted-foreground",
              )}
              title="When the landlord last confirmed availability"
            >
              {staleCheck
                ? "Availability not confirmed recently"
                : `Availability confirmed ${formatDate(
                    listing.availabilityConfirmedAt,
                    "MMM d",
                  )}`}
            </p>
          </div>
        </div>

      </div>
    </article>
  )
}
