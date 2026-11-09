import { ChevronRight, Clock3, MapPin, SearchX, Share2, Venus, Mars, UsersRound } from "lucide-react"
import { Link, useParams } from "react-router"
import { StatusBadge } from "@/components/common/status-badge"
import { AvailabilityConfirmed, VerifiedBadge } from "@/components/common/trust-badges"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { DetailSkeleton } from "@/components/feedback/skeletons"
import { MapView } from "@/components/maps/map-view"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { GENDER_POLICIES } from "@/constants/listing"
import { searchUrl } from "@/features/discovery/search-params"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { ActionPanel, MobileActionBar } from "@/features/listings/action-panel"
import { shareListing } from "@/features/listings/share-listing"
import { ListingCard } from "@/features/listings/listing-card"
import { ListingReviews } from "@/features/reviews/listing-reviews"
import { AmenityGrid, DetailSection, HouseRules, KeyFacts, LandlordCard, MoveInCosts, NearbyList, UnitsList } from "@/features/listings/listing-details"
import { ListingGallery } from "@/features/listings/listing-gallery"
import { fullAddress, typeLabel } from "@/features/listings/listing-utils"
import { useListing, useNearbyPlaces, useSimilarListings } from "@/features/listings/queries"
import { ReportListingDialog } from "@/features/listings/report-listing-dialog"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDistance, formatPesoShort } from "@/lib/format"
import { places } from "@/services"

const GENDER_ICON = { male: Mars, female: Venus, "co-ed": UsersRound } as const

function ListingPage() {
  const { id = "" } = useParams()
  const { data: listing, isPending, isError, error, refetch } = useListing(id)
  const nearby = useNearbyPlaces(id)
  const similar = useSimilarListings(id)
  useDocumentTitle(listing?.name)

  if (isPending) return <DetailSkeleton />
  if (isError) {
    const missing = (error as { code?: string }).code === "not-found"
    return (
      <div className="container-page py-16">
        {missing ? (
          <EmptyState
            icon={SearchX}
            headingLevel="h1" title="This listing isn't available"
            description="It may have been rented out or taken down by the landlord."
            action={
              <Button asChild>
                <Link to={PATHS.search}>Browse other places</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        )}
      </div>
    )
  }

  const town = places.municipality(listing.address.municipalityId)
  const GenderIcon = GENDER_ICON[listing.genderPolicy]
  const nearbyMarkers = (nearby.data ?? []).slice(0, 3).map((p) => ({ id: p.id, kind: "place" as const, position: p.coordinates, title: p.name }))

  return (
    <div className="pb-28 lg:pb-0">
      <div className="container-page pt-4 sm:pt-6">
        <nav aria-label="Breadcrumb" className="mb-4 hidden text-sm text-muted-foreground sm:block">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to={PATHS.search} className="hover:text-foreground">
                Pangasinan
              </Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <li>
              <Link to={searchUrl({ location: town?.slug })} className="hover:text-foreground">
                {town?.name}
              </Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <li aria-current="page" className="truncate text-foreground">
              {listing.name}
            </li>
          </ol>
        </nav>

        <ListingGallery photos={listing.photos} title={listing.name} />

        <div className="mt-6 grid gap-10 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="min-w-0">
            <header className="space-y-4 pb-8">
              {listing.status === "pending-review" && <StatusBadge tone="warning">Preview: pending review</StatusBadge>}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="type-page-title">{listing.name}</h1>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
                    <span className="font-medium">
                      {typeLabel(listing)} in {town?.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <GenderIcon className="size-3.5" aria-hidden="true" />
                      {GENDER_POLICIES[listing.genderPolicy]}
                    </span>
                    {listing.isVerified && <VerifiedBadge size="md" />}
                    <AvailabilityConfirmed at={listing.availabilityConfirmedAt} className="text-sm" />
                  </p>
                  <p className="max-w-2xl text-lg text-muted-foreground">{listing.tagline}</p>
                </div>
                <div className="flex gap-2 lg:hidden">
                  <Button variant="outline" size="icon" onClick={() => shareListing(listing)} aria-label="Share listing">
                    <Share2 aria-hidden="true" />
                  </Button>
                  <FavoriteButton listingId={listing.id} name={listing.name} className="size-10 rounded-lg border border-ink/20 shadow-none" />
                </div>
              </div>
              <p className="flex items-start gap-2 text-body">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {fullAddress(listing)}
              </p>
              {listing.nearestUniversity && (
                <p className="flex items-center gap-2 text-body text-muted-foreground">
                  <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                  About {formatDistance(listing.nearestUniversity.distanceKm)} from{" "}
                  {listing.nearestUniversity.university.shortName}
                </p>
              )}
            </header>

            <KeyFacts listing={listing} />

            <div className="mt-10">
              <DetailSection id="about" title="About this place">
                <div className="max-w-prose space-y-4 text-body text-foreground/85">
                  {listing.description.split("\n\n").map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
              </DetailSection>
              <DetailSection id="costs" title="Rent and move-in costs">
                <MoveInCosts listing={listing} />
              </DetailSection>
              <DetailSection id="units" title="Rooms and availability">
                <UnitsList listing={listing} />
              </DetailSection>
              <DetailSection id="amenities" title="What's included">
                <AmenityGrid listing={listing} />
              </DetailSection>
              <DetailSection id="rules" title="House rules">
                <HouseRules listing={listing} />
              </DetailSection>
              <DetailSection id="location" title="Location">
                <p className="mb-4 text-sm text-muted-foreground">
                  Exact address is shared by the landlord once your viewing is confirmed. Pin shows the approximate location.
                </p>
                <MapView
                  label={`Map showing ${listing.name}`}
                  markers={[{ id: listing.id, kind: "listing", position: listing.coordinates, title: listing.name, label: formatPesoShort(listing.priceFrom), verified: listing.isVerified }, ...nearbyMarkers]}
                  activeId={listing.id}
                  className="h-72 rounded-xl sm:h-80"
                />
                <div className="mt-5">
                  <h3 className="mb-1 text-sm font-semibold">Nearby schools and landmarks</h3>
                  <NearbyList places={nearby.data ?? []} />
                </div>
              </DetailSection>
              <DetailSection id="reviews" title="Reviews of this place">
                <ListingReviews listing={listing} />
              </DetailSection>
              <DetailSection id="landlord" title="Your landlord">
                <LandlordCard listing={listing} />
              </DetailSection>
              <div className="border-t border-border pt-4">
                <ReportListingDialog listingId={listing.id} listingName={listing.name} />
              </div>
            </div>
          </div>

          <aside className="hidden lg:block" aria-label="Contact and viewing">
            <div className="sticky top-[calc(var(--header-height)+1.5rem)]">
              <ActionPanel listing={listing} />
            </div>
          </aside>
        </div>
      </div>

      {similar.data && similar.data.length > 0 && (
        <section className="container-page mt-16 border-t border-border pt-10 sm:mt-20" aria-labelledby="similar-title">
          <h2 id="similar-title" className="mb-6 type-section-title">
            More places nearby
          </h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {similar.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <MobileActionBar listing={listing} />
    </div>
  )
}

export { ListingPage as Component }
