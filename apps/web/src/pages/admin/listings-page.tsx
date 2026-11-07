import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, ChevronRight, Flag, LayoutList } from "lucide-react"
import { useMemo, useState } from "react"
import { LineTabs } from "@/components/common/line-tabs"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PROPERTY_TYPES } from "@/constants/listing"
import { LISTING_STATUS } from "@/constants/status"
import { ListingReview } from "@/features/admin/listing-review"
import { ReviewSplit } from "@/features/admin/review-split"
import { useReviewSelection } from "@/features/admin/use-review-selection"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, formatRelative, pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { adminService } from "@/services"
import type { ListingStatus, PropertyType } from "@/types"

type Tab = ListingStatus | "all"

const TABS: Tab[] = [
  "pending-review",
  "active",
  "suspended",
  "rejected",
  "draft",
  "archived",
  "all",
]

/** A focused review list rather than a heavy collection of nested admin cards. */
function ModerationPage() {
  useDocumentTitle("Listing moderation")

  const [tab, setTab] = useState<Tab>("pending-review")
  const [linkChecked, setLinkChecked] = useState(false)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.moderation,
    queryFn: adminService.listModeration,
  })

  const rows = useMemo(
    () => (data ?? []).filter((listing) => tab === "all" || listing.status === tab),
    [data, tab],
  )
  const ids = useMemo(() => rows.map((listing) => listing.id), [rows])
  const { reviewId, setReview, advance } = useReviewSelection(ids, !isPending)

  const counts = useMemo(() => {
    const result = Object.fromEntries(TABS.map((status) => [status, 0])) as Record<Tab, number>
    for (const listing of data ?? []) {
      result.all += 1
      result[listing.status] += 1
    }
    return result
  }, [data])

  const flagged = useMemo(
    () => (data ?? []).filter((listing) => listing.reportCount > 0).length,
    [data],
  )

  // Preserve deep links from reports/overview: the URL-selected listing
  // must automatically open under its actual status, not the default tab.
  if (data && !linkChecked) {
    setLinkChecked(true)
    const target = data.find((listing) => listing.id === reviewId)
    if (target) setTab(target.status)
  }

  return (
    <div className="w-full space-y-4">
      <AdminPageHeader
        title="Listing moderation"
        description="Review new and reported listings so renters can trust what they see."
        metric={
          <HeaderMetric
            loading={isPending}
            value={formatNumber(counts["pending-review"])}
            label="Awaiting review"
            detail={isPending ? undefined : `${pluralize(counts.all, "listing")} in total, ${formatNumber(flagged)} with reports`}
          />
        }
      />

      <section aria-labelledby="moderation-workspace-title" className="min-w-0 space-y-4">
        <h2 id="moderation-workspace-title" className="sr-only">
          Review workspace
        </h2>

        {/* Keep the existing fully functional tab component and all seven statuses. */}
        <div className="min-w-0">
          <LineTabs
            label="Filter listings by status"
            value={tab}
            onChange={(next) => {
              setTab(next)
              setReview(null)
            }}
            tabs={TABS.map((status) => ({
              value: status,
              label: status === "all" ? "All" : LISTING_STATUS[status].label,
              count: data ? counts[status] : undefined,
            }))}
          />
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading listing moderation workspace">
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        ) : (
          <ReviewSplit
            label="Listing review"
            itemId={reviewId}
            open={Boolean(reviewId)}
            onClose={() => setReview(null)}
            queue={
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-caption font-semibold text-muted-foreground">Queue</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {tab === "all" ? "All listings" : LISTING_STATUS[tab].label}
                    </p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {formatNumber(rows.length)} {rows.length === 1 ? "result" : "results"}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <EmptyState
                    compact
                    icon={LayoutList}
                    title="Queue is clear"
                    description="No listings with this status right now."
                  />
                ) : (
                  <ul aria-label="Listings" className="divide-y divide-border/70">
                    {rows.map((listing) => {
                      const selected = listing.id === reviewId

                      return (
                        <li key={listing.id}>
                          <button
                            type="button"
                            onClick={() => setReview(listing.id)}
                            aria-pressed={selected}
                            className={cn(
                              "group relative flex w-full min-w-0 items-center gap-3 border-l-2 px-3 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring motion-reduce:transition-none sm:gap-4 sm:px-4",
                              selected
                                ? "border-l-primary bg-primary/[0.045]"
                                : "border-l-transparent hover:bg-muted/40",
                            )}
                          >
                            <Photo
                              src={listing.photoSrc}
                              alt=""
                              className="size-14 shrink-0 rounded-md sm:size-16"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-meta font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-sm">
                                  {listing.name}
                                </span>
                                {listing.isVerified && (
                                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />
                                )}
                              </span>
                              <span className="mt-1 block truncate text-xs leading-snug text-muted-foreground">
                                {PROPERTY_TYPES[listing.type as PropertyType].label}, {listing.municipality}
                              </span>
                              <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                                {listing.landlordName}
                              </span>
                              <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <MetaBadge meta={LISTING_STATUS[listing.status]} />
                                {listing.reportCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-caption font-semibold text-destructive">
                                    <Flag className="size-3.5" aria-hidden="true" />
                                    {listing.reportCount}
                                    <span className="sr-only"> {listing.reportCount === 1 ? "report" : "reports"}</span>
                                  </span>
                                )}
                                <span className="text-caption tabular-nums text-muted-foreground">
                                  {formatRelative(listing.updatedAt)}
                                </span>
                              </span>
                            </span>

                            <ChevronRight
                              className={cn(
                                "size-4 shrink-0 transition-[color,translate]",
                                selected
                                  ? "translate-x-0.5 text-primary"
                                  : "text-muted-foreground/50 motion-safe:group-hover:translate-x-0.5 group-hover:text-foreground",
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            }
            detail={
              reviewId ? (
                <ListingReview
                  key={reviewId}
                  listingId={reviewId}
                  onDecided={() => advance(reviewId, ids)}
                />
              ) : (
                <EmptyState
                  compact
                  icon={LayoutList}
                  title="Nothing to review here"
                  description="Choose a listing from the queue to inspect its details."
                />
              )
            }
          />
        )}
      </section>
    </div>
  )
}

export { ModerationPage as Component }
