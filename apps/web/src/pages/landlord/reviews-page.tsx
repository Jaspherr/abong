import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { Link } from "react-router"
import { PageHeader, SectionHeading } from "@/components/common/page-header"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { ReputationSummary } from "@/features/reviews/reputation-summary"
import { ReviewList } from "@/features/reviews/review-list"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { qk } from "@/lib/query"
import { reviewsService } from "@/services"

/** Reviews of the landlord's places, with a public reply on each. Reviews can't be edited or removed here. */
function LandlordReviewsPage() {
  useDocumentTitle("Reviews")
  const { user, session } = useAuth()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.reviewsAboutMe(user!.id), queryFn: reviewsService.listAboutMe })
  const landlordId = session?.landlordProfile?.id

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      <PageHeader
        title="Reviews"
        description="What renters said about your places. Reply publicly to thank them, explain, or say what changed."
      />
      {isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Renters can review a completed viewing, or a stay you both confirmed after 30 days or once they move out."
        />
      ) : (
        <>
          <section aria-labelledby="summary-title" className="space-y-4">
            <SectionHeading titleId="summary-title" title="Summary" description="As renters see it on your public profile." />
            <ReputationSummary summary={data.summary} />
          </section>
          <section aria-labelledby="list-title" className="space-y-4">
            <SectionHeading titleId="list-title" title="All reviews" />
            <ReviewList reviews={data.reviews} landlordName={session?.landlordProfile?.displayName ?? "you"} showProperty />
          </section>
          <p className="text-caption text-muted-foreground">
            If a review shares private details, harasses you, or isn't from a real stay or viewing, use Report on it. An admin
            checks it against the review rules. Honest negative reviews stay up.{" "}
            {landlordId && (
              <Link to={`${PATHS.landlordProfile(landlordId)}#reviews`} className="font-medium text-foreground underline decoration-ink/25 underline-offset-4">
                See your public page
              </Link>
            )}
          </p>
        </>
      )}
    </div>
  )
}

export { LandlordReviewsPage as Component }
