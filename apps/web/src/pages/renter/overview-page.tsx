import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, CalendarDays, Heart, House, MessageSquare, Plus, Search } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { PageHeader, SectionHeading } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { ErrorState } from "@/components/feedback/states"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { REVIEW_KIND, REVIEW_STATUS } from "@/constants/reviews"
import { useAuth } from "@/features/auth/auth-context"
import { useFavoriteIds } from "@/features/favorites/use-favorites"
import { ProposeRentalDialog } from "@/features/rentals/propose-rental-dialog"
import { RentalActions } from "@/features/rentals/rental-actions"
import { RentalCard } from "@/features/rentals/rental-card"
import { ReviewDialog } from "@/features/reviews/review-dialog"
import { Stars } from "@/features/reviews/stars"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate, pluralize, todayIso } from "@/lib/format"
import { qk } from "@/lib/query"
import { inquiriesService, rentalsService, reviewsService, viewingsService, type MyReview, type ReviewOpportunity } from "@/services"

function ExploreLink({ to, icon: Icon, label, detail }: { to: string; icon: LucideIcon; label: string; detail: string }) {
  return (
    <Link to={to} className="group flex min-w-0 items-center gap-3 rounded-xl bg-card p-4 shadow-card hover:bg-muted/50">
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{label}</span>
        <span className="block truncate text-meta text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
    </Link>
  )
}

function OpportunityRow({ item }: { item: ReviewOpportunity }) {
  const e = item.eligibility
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-body font-semibold break-words">{item.propertyName}</p>
        <p className="text-meta text-muted-foreground">
          {item.kind === "residence" ? "Your stay" : `Viewing on ${formatDate(item.date, "MMMM d")}`} with {item.landlordName}
        </p>
      </div>
      {e.state === "eligible" ? (
        <ReviewDialog target={{ mode: "create", kind: item.kind, sourceId: item.sourceId, propertyName: item.propertyName, landlordName: item.landlordName }}>
          <Button size="sm" className="w-fit">
            {item.kind === "residence" ? "Review your stay" : "Review the viewing"}
          </Button>
        </ReviewDialog>
      ) : e.state === "not-yet" ? (
        <p className="text-meta text-muted-foreground">Open from {formatDate(e.from, "MMMM d")}</p>
      ) : null}
    </li>
  )
}

function MyReviewRow({ review }: { review: MyReview }) {
  const client = useQueryClient()
  const remove = useMutation({
    mutationFn: () => reviewsService.remove(review.id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["reviews"] })
      client.invalidateQueries({ queryKey: ["rentals"] })
      toast.success("Review removed")
    },
    onError: () => toast.error("Couldn't remove the review. Try again."),
  })
  const status = REVIEW_STATUS[review.status]
  return (
    <li className="space-y-2 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars value={review.overall} />
        <span className="text-meta font-semibold">{review.propertyName}</span>
        <StatusBadge tone="neutral" dot={false}>
          {REVIEW_KIND[review.kind].badge}
        </StatusBadge>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      <p className="text-caption text-muted-foreground">
        {status.hint} Written {formatDate(review.createdAt, "MMMM d, yyyy")}
        {review.response ? `. ${review.landlordName} replied.` : "."}
      </p>
      {review.body && <p className="line-clamp-2 max-w-prose text-meta">{review.body}</p>}
      <div className="flex gap-1">
        {review.status !== "hidden" && (
          <ReviewDialog target={{ mode: "edit", review }}>
            <Button size="sm" variant="ghost" className="-ml-3">
              Edit
            </Button>
          </ReviewDialog>
        )}
        {review.status !== "hidden" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost">
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove your review?</AlertDialogTitle>
              <AlertDialogDescription>
                It's deleted for good, along with any reply to it. You won't be able to review this {review.kind === "residence" ? "stay" : "viewing"} again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate()}>Remove review</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}
      </div>
    </li>
  )
}

/**
 * The renter's home base. Searching stays front and centre; a stay they've confirmed adds a
 * "Your home" section on top rather than replacing anything.
 */
function RenterOverviewPage() {
  useDocumentTitle("Overview")
  const { user } = useAuth()
  const userId = user!.id
  const today = todayIso()
  const saved = useFavoriteIds().size

  const rentals = useQuery({ queryKey: qk.myRentals(userId), queryFn: rentalsService.listMine })
  const opportunities = useQuery({ queryKey: qk.reviewOpportunities(userId), queryFn: reviewsService.myOpportunities })
  const myReviews = useQuery({ queryKey: qk.myReviews(userId), queryFn: reviewsService.listMine })
  const inquiries = useQuery({ queryKey: qk.renterInquiries(userId), queryFn: () => inquiriesService.listForRenter(userId) })
  const viewings = useQuery({ queryKey: qk.renterViewings(userId), queryFn: () => viewingsService.listForRenter(userId) })

  const all = rentals.data ?? []
  const toAnswer = all.filter((r) => r.awaitingMe)
  const homes = all.filter((r) => r.phase === "current" || r.phase === "upcoming" || (r.phase === "disputed" && r.dispute?.previousStatus === "confirmed"))
  const waiting = all.filter((r) => r.phase === "pending" && !r.awaitingMe)
  const history = all.filter((r) => !homes.includes(r) && !toAnswer.includes(r) && !waiting.includes(r))
  const openReviews = (opportunities.data ?? []).filter((o) => o.eligibility.state === "eligible" || o.eligibility.state === "not-yet")

  const openInquiries = inquiries.data?.filter((i) => i.status === "open").length ?? 0
  const upcomingViewings = viewings.data?.filter((v) => v.status === "pending" || v.status === "confirmed").length ?? 0

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-12 pb-12">
      <PageHeader
        title="Overview"
        description="Your home, the places you're looking at, and reviews you can write."
        actions={
          <ProposeRentalDialog>
            <Button variant="outline">
              <Plus aria-hidden="true" />
              Add a place you live
            </Button>
          </ProposeRentalDialog>
        }
      />

      {rentals.isError ? (
        <ErrorState onRetry={() => rentals.refetch()} />
      ) : rentals.isPending ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <>
          {toAnswer.length > 0 && (
            <section aria-labelledby="answer-title" className="space-y-4">
              <SectionHeading titleId="answer-title" title="Needs your answer" description="Your landlord recorded these stays. Confirm only what's right." />
              <div className="grid grid-cols-1 gap-4">
                {toAnswer.map((r) => (
                  <RentalCard key={r.id} rental={r} actions={<RentalActions rental={r} today={today} />} />
                ))}
              </div>
            </section>
          )}

          {(homes.length > 0 || waiting.length > 0) && (
            <section aria-labelledby="home-title" className="space-y-4">
              <SectionHeading
                titleId="home-title"
                title={homes.length > 1 ? "Your homes" : "Your home"}
                description="Only you, your landlord and Abong admins can see this."
              />
              <div className="grid grid-cols-1 gap-4">
                {homes.map((r) => (
                  <RentalCard key={r.id} rental={r} emphasis={homes.length === 1} actions={<RentalActions rental={r} today={today} />} />
                ))}
                {waiting.map((r) => (
                  <RentalCard key={r.id} rental={r} actions={<RentalActions rental={r} today={today} />} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="explore-title" className="space-y-4">
        <SectionHeading
          titleId="explore-title"
          title={homes.length ? "Keep exploring" : "Your search"}
          description={homes.length ? "Living somewhere doesn't stop you looking. Everything here still works as before." : undefined}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ExploreLink to={PATHS.search} icon={Search} label="Find a place" detail="Search by town or school" />
          <ExploreLink to={PATHS.favorites} icon={Heart} label="Saved" detail={pluralize(saved, "place")} />
          <ExploreLink to={PATHS.inquiries} icon={MessageSquare} label="Inquiries" detail={`${openInquiries} open`} />
          <ExploreLink to={PATHS.viewings} icon={CalendarDays} label="Viewings" detail={`${upcomingViewings} coming up`} />
        </div>
        {!homes.length && !rentals.isPending && (
          <p className="flex items-start gap-2.5 text-meta text-muted-foreground">
            <House className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Found a place? Add it once the landlord has replied to you or confirmed a viewing. After they confirm, you can review
            your stay.
          </p>
        )}
      </section>

      {(openReviews.length > 0 || (myReviews.data?.length ?? 0) > 0) && (
        <section aria-labelledby="reviews-title" className="space-y-4">
          <SectionHeading
            titleId="reviews-title"
            title="Reviews"
            description="Stays open for review after 30 days, or once you move out. Completed viewings can be reviewed for 90 days."
          />
          {openReviews.length > 0 && (
            <ul aria-label="Reviews you can write" className="divide-y divide-border border-y border-border">
              {openReviews.map((o) => (
                <OpportunityRow key={`${o.kind}-${o.sourceId}`} item={o} />
              ))}
            </ul>
          )}
          {(myReviews.data?.length ?? 0) > 0 && (
            <div>
              <h3 className="type-card-title">Your reviews</h3>
              <ul className="divide-y divide-border">
                {myReviews.data!.map((r) => (
                  <MyReviewRow key={r.id} review={r} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="history-title" className="space-y-4">
          <SectionHeading titleId="history-title" title="Rental history" description="Past stays and ones that weren't confirmed. Private to you and the landlord." />
          <div className="grid grid-cols-1 gap-4">
            {history.map((r) => (
              <RentalCard key={r.id} rental={r} actions={<RentalActions rental={r} today={today} />} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export { RenterOverviewPage as Component }
