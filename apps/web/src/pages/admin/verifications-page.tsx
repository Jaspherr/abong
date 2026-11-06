import { useQuery } from "@tanstack/react-query"
import { ChevronRight, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { LineTabs } from "@/components/common/line-tabs"
import { MetaBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { ReviewSplit } from "@/features/admin/review-split"
import { useReviewSelection } from "@/features/admin/use-review-selection"
import { VerificationReview } from "@/features/admin/verification-review"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, formatRelative } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { verificationService } from "@/services"

type Tab = "pending" | "reviewed"

/**
 * A task-first verification workspace, designed to match the editorial
 * treatment of the Abong Admin Overview and Listing Moderation pages.
 * Existing query, review-selection, and decision behavior remain intact.
 */
function VerificationsPage() {
  useDocumentTitle("Verifications")

  const [tab, setTab] = useState<Tab>("pending")
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.verifications,
    queryFn: verificationService.listQueue,
  })

  const totals = useMemo(() => {
    const pending = (data ?? []).filter((item) => item.status === "pending").length
    const reviewed = (data?.length ?? 0) - pending
    return { pending, reviewed, all: data?.length ?? 0 }
  }, [data])

  const rows = useMemo(() => {
    const matching = (data ?? []).filter((item) =>
      tab === "pending" ? item.status === "pending" : item.status !== "pending",
    )

    // Preserve the queue's existing ordering: pending requests are oldest first.
    return tab === "pending" ? matching.reverse() : matching
  }, [data, tab])

  const ids = useMemo(() => rows.map((item) => item.id), [rows])
  const { reviewId, setReview, advance } = useReviewSelection(ids, !isPending)
  const open = data?.find((item) => item.id === reviewId) ?? null

  return (
    <div className="w-full space-y-4">
      <AdminPageHeader
        title="Verifications"
        description="Review identity, contact and property submissions. The oldest requests come first."
        metric={
          <HeaderMetric
            loading={isPending}
            value={isError ? "—" : formatNumber(totals.pending)}
            label="Awaiting review"
            detail={isPending || isError ? undefined : `${formatNumber(totals.all)} submitted, ${formatNumber(totals.reviewed)} reviewed`}
          />
        }
      />

      <section aria-labelledby="verifications-workspace-title" className="min-w-0 space-y-4">
        <h2 id="verifications-workspace-title" className="sr-only">
          Review workspace
        </h2>

        {/* Keep the working tab component and its selection-reset behavior. */}
        <div className="min-w-0">
          <LineTabs
            label="Filter verifications"
            value={tab}
            onChange={(next) => {
              setTab(next)
              setReview(null)
            }}
            tabs={[
              { value: "pending", label: "Waiting", count: data ? totals.pending : undefined },
              { value: "reviewed", label: "Reviewed" },
            ]}
          />
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <div
            className="grid gap-4 lg:grid-cols-2"
            aria-label="Loading verification review workspace"
          >
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        ) : (
          <ReviewSplit
            label="Verification review"
            itemId={reviewId}
            open={Boolean(open)}
            onClose={() => setReview(null)}
            queue={
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-caption font-semibold text-muted-foreground">
                      Queue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {tab === "pending" ? "Awaiting verification" : "Reviewed submissions"}
                    </p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {formatNumber(rows.length)} {rows.length === 1 ? "result" : "results"}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ShieldCheck}
                    title={tab === "pending" ? "Nothing waiting" : "Nothing reviewed yet"}
                    description={
                      tab === "pending"
                        ? "New submissions appear here when they need review."
                        : "Reviewed submissions will appear here."
                    }
                  />
                ) : (
                  <ul aria-label="Verification requests" className="divide-y divide-border/70">
                    {rows.map((item) => {
                      const selected = item.id === reviewId
                      const typeLabel = VERIFICATION_TYPES[item.type].label

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setReview(item.id)}
                            aria-pressed={selected}
                            className={cn(
                              "group relative flex w-full min-w-0 items-center gap-3 border-l-2 px-3 py-4 text-left transition-colors duration-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring motion-reduce:transition-none sm:gap-4 sm:px-4",
                              selected
                                ? "border-l-primary bg-primary/[0.045]"
                                : "border-l-transparent hover:bg-muted/40",
                            )}
                          >
                            <span className="shrink-0" aria-hidden="true">
                              <UserAvatar name={item.landlordName} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-meta font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-sm">
                                {item.landlordName}
                              </span>
                              <span className="mt-1 block truncate text-xs leading-snug text-muted-foreground">
                                {typeLabel}
                                {item.propertyName ? `, ${item.propertyName}` : ""}
                              </span>
                              <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <MetaBadge meta={VERIFICATION_STATUS[item.status]} />
                                <span className="text-caption tabular-nums text-muted-foreground">
                                  Submitted {formatRelative(item.submittedAt)}
                                </span>
                              </span>
                            </span>

                            <ChevronRight
                              className={cn(
                                "size-4 shrink-0 transition-all duration-150 motion-reduce:transition-none",
                                selected
                                  ? "translate-x-0.5 text-primary"
                                  : "text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-foreground",
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
              open ? (
                <VerificationReview
                  key={open.id}
                  item={open}
                  onDecided={() => advance(open.id, ids)}
                />
              ) : (
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Nothing to review here"
                  description="Choose a submission from the queue to inspect its details."
                />
              )
            }
          />
        )}
      </section>
    </div>
  )
}

export { VerificationsPage as Component }
