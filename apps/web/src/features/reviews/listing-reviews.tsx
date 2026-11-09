import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { reviewsService, type RatingSummary } from "@/services"
import type { Listing } from "@/types"
import { ReputationSummary } from "./reputation-summary"
import { ReviewList, ReviewSourceNote } from "./review-list"

/** One line on the landlord's record across all their properties, labelled as such. */
export function LandlordRatingLine({ summary, landlordId }: { summary: RatingSummary; landlordId: string }) {
  const { residence, viewing } = summary
  const total = residence.count + viewing.count
  if (!total) return <p className="text-sm text-muted-foreground">No reviews of this landlord yet.</p>
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Across all their places: </span>
      {residence.average !== undefined
        ? `${residence.average.toFixed(1)} out of 5 from ${pluralize(residence.count, "resident review")}`
        : pluralize(residence.count, "resident review")}
      {viewing.count > 0 && `, ${pluralize(viewing.count, "viewing review")}`}.{" "}
      <Link to={`${PATHS.landlordProfile(landlordId)}#reviews`} className="font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-foreground">
        Read them
      </Link>
    </p>
  )
}

/** Reviews of this property only. The landlord's wider record lives on their profile. */
export function ListingReviews({ listing }: { listing: Listing }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.listingReviews(listing.id),
    queryFn: () => reviewsService.listForListing(listing.id),
  })
  if (isPending) return <Skeleton className="h-32 rounded-xl" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  return (
    <div className="space-y-6">
      <ReputationSummary summary={data.summary} />
      <ReviewList reviews={data.reviews} landlordName={listing.landlord.displayName} />
      <ReviewSourceNote />
    </div>
  )
}
