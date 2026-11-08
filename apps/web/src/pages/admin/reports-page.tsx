import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Flag } from "lucide-react"
import { useMemo, useState } from "react"
import { LineTabs } from "@/components/common/line-tabs"
import { MetaBadge } from "@/components/common/status-badge"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { REPORT_REASONS, REPORT_STATUS } from "@/constants/status"
import { ReportReview } from "@/features/admin/report-review"
import { isOpenReport } from "@/features/admin/report-status"
import { ReviewSplit } from "@/features/admin/review-split"
import { useReviewSelection } from "@/features/admin/use-review-selection"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, formatRelative } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { adminService } from "@/services"

type Tab = "open" | "closed"

/**
 * A report-triage workspace in the same restrained editorial system as
 * Admin Overview, Listing Moderation, and Verifications.
 * Business logic, query keys, and the existing review workflow are retained.
 */
function ReportsPage() {
  useDocumentTitle("Reports")

  const [tab, setTab] = useState<Tab>("open")
  const [linkChecked, setLinkChecked] = useState(false)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.reports,
    queryFn: adminService.listReports,
  })

  const totals = useMemo(() => {
    const open = (data ?? []).filter((report) => isOpenReport(report.status)).length
    const all = data?.length ?? 0
    const priority = (data ?? []).filter(
      (report) => isOpenReport(report.status) && report.reason === "scam-concern",
    ).length

    return { open, closed: all - open, all, priority }
  }, [data])

  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((report) =>
          tab === "open" ? isOpenReport(report.status) : !isOpenReport(report.status),
        )
        // Preserve the established triage priority: scam concerns first.
        .sort(
          (a, b) =>
            Number(b.reason === "scam-concern") - Number(a.reason === "scam-concern"),
        ),
    [data, tab],
  )

  const ids = useMemo(() => rows.map((report) => report.id), [rows])
  const { reviewId, setReview, advance } = useReviewSelection(ids, !isPending)
  const selected = data?.find((report) => report.id === reviewId) ?? null

  // Preserve direct links from the overview or other admin surfaces,
  // including links to a report that has already been closed.
  if (data && !linkChecked) {
    setLinkChecked(true)
    const target = data.find((report) => report.id === reviewId)
    if (target) setTab(isOpenReport(target.status) ? "open" : "closed")
  }

  return (
    <div className="w-full space-y-4">
      <AdminPageHeader
        title="Reports"
        description="Concerns raised by renters and visitors. Scam reports come first."
        metric={
          <HeaderMetric
            loading={isPending}
            value={isError ? "—" : formatNumber(totals.open)}
            label="Open reports"
            detail={isPending || isError ? undefined : `${formatNumber(totals.priority)} open scam concerns, ${formatNumber(totals.closed)} closed`}
          />
        }
      />

      <section aria-labelledby="reports-workspace-title" className="min-w-0 space-y-4">
        <h2 id="reports-workspace-title" className="sr-only">
          Review workspace
        </h2>

        <div className="min-w-0">
          <LineTabs
            label="Filter reports"
            value={tab}
            onChange={(next) => {
              setTab(next)
              setReview(null)
            }}
            tabs={[
              { value: "open", label: "Open", count: data ? totals.open : undefined },
              { value: "closed", label: "Closed", count: data ? totals.closed : undefined },
            ]}
          />
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading report review workspace">
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        ) : (
          <ReviewSplit
            label="Report review"
            itemId={reviewId}
            open={Boolean(selected)}
            onClose={() => setReview(null)}
            queue={
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-caption font-semibold text-muted-foreground">
                      Queue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {tab === "open" ? "Open concerns" : "Closed reports"}
                    </p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {formatNumber(rows.length)} {rows.length === 1 ? "result" : "results"}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Flag}
                    title={tab === "open" ? "No open reports" : "No closed reports yet"}
                    description={
                      tab === "open"
                        ? "New concerns will appear here when they're reported."
                        : "Closed reports will appear here."
                    }
                  />
                ) : (
                  <ul aria-label="Reports" className="divide-y divide-border/70">
                    {rows.map((report) => {
                      const active = report.id === reviewId
                      const priority = report.reason === "scam-concern" && isOpenReport(report.status)

                      return (
                        <li key={report.id}>
                          <button
                            type="button"
                            onClick={() => setReview(report.id)}
                            aria-pressed={active}
                            className={cn(
                              "group relative flex w-full min-w-0 items-center gap-3 border-l-2 px-3 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring motion-reduce:transition-none sm:gap-4 sm:px-4",
                              active
                                ? "border-l-primary bg-primary/[0.045]"
                                : "border-l-transparent hover:bg-muted/40",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-md border",
                                priority
                                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                                  : "border-border/80 bg-muted/40 text-muted-foreground",
                              )}
                              aria-hidden="true"
                            >
                              <Flag className="size-4" strokeWidth={1.75} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="truncate text-meta font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-sm">
                                  {REPORT_REASONS[report.reason].label}
                                </span>
                                {priority && (
                                  <span className="shrink-0 text-caption font-semibold text-destructive">
                                    Priority
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block truncate text-xs leading-snug text-muted-foreground">
                                {report.listingName}
                              </span>
                              <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                                Landlord: {report.landlordName}
                              </span>
                              <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <MetaBadge meta={REPORT_STATUS[report.status]} />
                                <span className="text-caption tabular-nums text-muted-foreground">
                                  {formatRelative(report.createdAt)}, by {report.reporterName}
                                </span>
                              </span>
                            </span>

                            <ChevronRight
                              className={cn(
                                "size-4 shrink-0 transition-[color,translate]",
                                active
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
              selected ? (
                <ReportReview
                  key={selected.id}
                  report={selected}
                  related={(data ?? []).filter((other) => other.id !== selected.id && other.listingId === selected.listingId)}
                  onClosed={() => advance(selected.id, ids)}
                  onOpenRelated={(id) => {
                    const target = data?.find((other) => other.id === id)
                    if (target) setTab(isOpenReport(target.status) ? "open" : "closed")
                    setReview(id)
                  }}
                />
              ) : (
                <EmptyState
                  compact
                  icon={Flag}
                  title="Nothing to review here"
                  description="Choose a report from the queue to inspect its details."
                />
              )
            }
          />
        )}
      </section>
    </div>
  )
}

export { ReportsPage as Component }
