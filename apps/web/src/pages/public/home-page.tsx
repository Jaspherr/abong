
import { ArrowUpRight, Check, Compass, MapPin } from "lucide-react"
import { Link } from "react-router"

import { Photo } from "@/components/common/photo"
import { PATHS } from "@/constants/app"
import { HeroSearch } from "@/features/discovery/hero-search"
import {
  CategoriesSection,
  FeaturedListingsSection,
  HowItWorksSection,
  LandlordCtaSection,
  NearSchoolsSection,
  TownsSection,
  TrustSection,
} from "@/features/discovery/home-sections"
import {
  priceUnitLong,
  splitFeaturedListings,
  typeLabel,
} from "@/features/listings/listing-utils"
import {
  useFeaturedListings,
} from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { places } from "@/services"
import type { Listing } from "@/types"

// ============================================================
// FEATURED PROPERTY CARD
// ============================================================

interface HeroListingProps {
  listing: Listing
  priority?: boolean
  className?: string
}

function HeroListing({
  listing,
  priority,
  className,
}: HeroListingProps) {
  const photo =
    listing.photos.find(
      (image) => !image.src.includes("exterior"),
    ) ?? listing.photos[0]

  const municipality = places.municipalityName(
    listing.address.municipalityId,
  )

  return (
    <Link
      to={PATHS.listing(listing.id)}
      className={cn(
        "group relative isolate block min-w-0 overflow-hidden",
        "rounded-2xl bg-muted",
        "outline-none transition-shadow duration-200",
        "hover:shadow-raised",
        "focus-visible:ring-4 focus-visible:ring-primary/40",
        className,
      )}
    >
      {/* Property photograph */}
      <Photo
        src={photo?.src}
        alt={photo?.alt ?? listing.name}
        priority={priority}
        className="absolute inset-0 h-full w-full"
        hoverZoom
      />

      {/* Contrast overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/15"
        aria-hidden="true"
      />

      {/* Top indicators */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-2 text-caption font-semibold text-white backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-white" />
          Featured place
        </span>

        <div className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-neutral-950">
          <ArrowUpRight
            className="size-5 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Property details */}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">

        <h2 className="line-clamp-2 font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
          {listing.name}
        </h2>

        <div className="mt-2 flex items-center gap-1.5 text-xs leading-5 text-white/75 sm:text-sm">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {typeLabel(listing)}, {municipality}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/25 pt-4">
          <div>
            <span className="block text-caption font-medium text-white/65">
              Starting at
            </span>

            <span className="mt-1 block font-display text-2xl font-semibold tracking-tight tabular-nums">
              {formatPeso(listing.priceFrom)}
            </span>
          </div>

          <span className="pb-1 text-xs text-white/70">
            {priceUnitLong(listing.pricingBasis)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ============================================================
// HERO PROPERTY GALLERY
// ============================================================

interface HeroGalleryProps {
  first?: Listing
  second?: Listing
}

function HeroGallery({ first, second }: HeroGalleryProps) {
  const listings = [first, second].filter(
    (listing): listing is Listing => Boolean(listing),
  )

  return (
    <div className="min-w-0">

      {/* Mobile / tablet: horizontal swipe gallery */}
      <div className="lg:hidden">
        <div className="mb-4 flex items-center justify-between gap-4 px-1">
          <span className="text-caption font-semibold text-muted-foreground">
            A look inside
          </span>

          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Explore places
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>

        {listings.length > 0 ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-none sm:-mx-6 sm:px-6">
            {listings.map((listing, index) => (
              <HeroListing
                key={listing.id}
                listing={listing}
                priority={index === 0}
                className="h-[23rem] w-[84%] shrink-0 snap-start sm:h-[27rem] sm:w-[58%]"
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-muted/50 p-8 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              Explore available places using the search above.
            </p>
          </div>
        )}
      </div>

      {/* Desktop: asymmetric editorial gallery */}
      <div className="hidden h-136 grid-cols-[1.12fr_0.88fr] gap-3 lg:grid xl:h-148">

        {first ? (
          <HeroListing
            listing={first}
            priority
            className="h-full"
          />
        ) : (
          <div className="flex h-full flex-col justify-end rounded-2xl bg-muted p-8">
            <Compass className="mb-5 size-9 text-primary" />
            <p className="font-heading text-2xl font-semibold tracking-tight">
              Your next place starts here.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Explore spaces across Pangasinan.
            </p>
          </div>
        )}

        <div className="flex h-full min-w-0 flex-col gap-3">

          {/* Branded editorial tile */}
          <div className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground xl:p-6">

            <div className="relative flex items-center justify-between">
              <span className="text-caption font-semibold text-primary-foreground/70">
                Abong discovery
              </span>

              <Compass
                className="size-5 text-primary-foreground/75"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </div>

            <p className="relative mt-6 max-w-[13rem] font-heading text-xl font-semibold leading-[1.1] tracking-tight xl:text-2xl">
              A new chapter starts with the right space.
            </p>
          </div>

          {second ? (
            <HeroListing
              listing={second}
              className="h-[21rem] shrink-0 xl:h-[23rem]"
            />
          ) : (
            <div className="flex h-[21rem] shrink-0 flex-col justify-end rounded-2xl border border-border bg-card p-6 xl:h-[23rem]">
              <p className="text-caption font-semibold text-muted-foreground">
                Explore Pangasinan
              </p>

              <p className="mt-4 font-heading text-xl font-semibold tracking-tight">
                Your place, your pace.
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Browse rooms, apartments, and homes that fit your plans.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN HERO
// ============================================================

function Hero() {
  const { data: featured = [] } = useFeaturedListings()

  const {
    hero: [first, second],
  } = splitFeaturedListings(featured)

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-section flex-col justify-center bg-background"
    >
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-gradient-to-b from-primary/[0.055] via-primary/[0.018] to-transparent"
      />

      <div className="container-page pt-8 pb-16 sm:pt-12 lg:pt-16 lg:pb-20">
        <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 xl:gap-14">

          {/* LEFT: HEADLINE / DISCOVERY */}
          <div className="animate-rise relative z-10 min-w-0">

            {/* Headline */}
            <h1
              id="hero-title"
              className="mt-7 max-w-[11ch] font-display text-[clamp(3.8rem,6.4vw,6.5rem)] font-semibold leading-[0.99] tracking-[-0.065em] text-foreground"
            >
              Find your place
              <span className="block text-primary">
                in Pangasinan.
              </span>
            </h1>

            {/* Supporting message */}
            <p className="mt-6 max-w-[32rem] text-base leading-[1.8] text-muted-foreground sm:text-lg">
              From bedspaces and boarding houses to apartments and
              family homes. Find somewhere that fits your life,
              with rent and move-in costs clearly laid out.
            </p>

            {/* Search */}
            <div className="relative z-20 mt-9 max-w-[36rem]">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-caption font-semibold text-foreground/70">
                  Start your search
                </span>

                <span className="h-px flex-1 bg-border" />
              </div>

              <HeroSearch />
            </div>

            {/* Supporting points */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
                Clear rental pricing
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
                Advance & deposit information
              </span>
            </div>
          </div>

          {/* RIGHT: FEATURED SPACES */}
          <HeroGallery first={first} second={second} />
        </div>
      </div>
    </section>
  )
}

// ============================================================
// HOME PAGE
// ============================================================

function HomePage() {
  useDocumentTitle()

  return (
    <>
      <Hero />

      <FeaturedListingsSection />

      <NearSchoolsSection />

      <CategoriesSection />

      <TownsSection />

      <HowItWorksSection />

      <TrustSection />

      <LandlordCtaSection />
    </>
  )
}

export { HomePage as Component }
