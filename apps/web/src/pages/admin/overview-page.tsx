import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, CheckCheck, ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { Sparkline } from "@/components/charts/trend-chart"
import { ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { LISTING_STATUS, REPORT_REASONS, REPORT_STATUS, VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { isOpenReport } from "@/features/admin/report-status"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, formatRelative, formatSignedPercent, pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { adminService, verificationService } from "@/services"
import type { ActivityKind } from "@/types"

const ACTIVITY_DOT: Record<ActivityKind, string> = {
  signup: "bg-chart-2",
  "listing-submitted": "bg-warning",
  "listing-approved": "bg-success",
  "verification-submitted": "bg-info",
  "report-filed": "bg-destructive",
  inquiry: "bg-chart-1",
  viewing: "bg-chart-1",
}

const PREVIEW = 3

interface QueueItem {
  id: string
  to: string
  lead: ReactNode
  title: string
  detail: string
  badge: ReactNode
}

interface QueueProps {
  title: string
  hint: string
  to: string
  count: number | undefined
  items: QueueItem[]
  loading: boolean
  error: boolean
}

/** Each queue is a calm, scannable worklist — not another dashboard card. */
function Queue({ title, hint, to, count, items, loading, error }: QueueProps) {
  return (
    <section aria-label={title} className="border-t border-border/80 py-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
            <h3 className="flex flex-wrap items-baseline gap-2 text-body font-semibold tracking-[-0.015em] text-foreground">
              {title}
              {!loading && count !== undefined && (
                <span className="text-meta font-medium tabular-nums text-muted-foreground">{formatNumber(count)}</span>
              )}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
        <Link
          to={to}
          aria-label={`View all ${title.toLowerCase()}`}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-sm py-1 text-xs font-medium text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none"
        >
          View all
          <ArrowUpRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2" aria-label={`Loading ${title.toLowerCase()}`}>
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      ) : error ? (
        <div className="rounded-md bg-muted/40 px-4 py-4 text-sm text-muted-foreground" role="status">
          Preview unavailable. Open the queue to review its items.
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-muted/35 px-3 py-3.5 text-sm text-muted-foreground">
          <CheckCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
          Nothing waiting
        </div>
      ) : (
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className="group flex min-w-0 items-center gap-3 rounded-sm px-2 py-3 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring motion-reduce:transition-none sm:gap-4"
              >
                <span className="shrink-0">{item.lead}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary motion-reduce:transition-none">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-xs leading-snug text-muted-foreground">{item.detail}</span>
                </span>
                <span className="hidden shrink-0 sm:block">{item.badge}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SectionHeading({ title, id }: { title: string; id: string }) {
  return (
    <h2 id={id} className="mb-4 type-subsection">
      {title}
    </h2>
  )
}

function AdminOverviewPage() {
  useDocumentTitle("Admin overview")
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.admin.overview, queryFn: adminService.getOverview })
  const moderation = useQuery({ queryKey: qk.admin.moderation, queryFn: adminService.listModeration })
  const verifications = useQuery({ queryKey: qk.admin.verifications, queryFn: verificationService.listQueue })
  const reports = useQuery({ queryKey: qk.admin.reports, queryFn: adminService.listReports })

  if (isError) return <ErrorState onRetry={() => refetch()} />

  const waiting = data ? data.queue.listings + data.queue.verifications + data.queue.reports : 0

  const listingItems: QueueItem[] = (moderation.data ?? [])
    .filter((r) => r.status === "pending-review")
    .slice(0, PREVIEW)
    .map((r) => ({
      id: r.id,
      to: `${PATHS.admin.listings}?review=${r.id}`,
      lead: <Photo src={r.photoSrc} alt="" className="size-10 shrink-0 rounded-md" />,
      title: r.name,
      detail: `${r.landlordName}, ${r.municipality}. Updated ${formatRelative(r.updatedAt)}`,
      badge: <MetaBadge meta={LISTING_STATUS[r.status]} />,
    }))

  const verificationItems: QueueItem[] = (verifications.data ?? [])
    .filter((r) => r.status === "pending")
    .reverse()
    .slice(0, PREVIEW)
    .map((r) => ({
      id: r.id,
      to: `${PATHS.admin.verifications}?review=${r.id}`,
      lead: <UserAvatar name={r.landlordName} />,
      title: r.landlordName,
      detail: `${VERIFICATION_TYPES[r.type].label} check. Submitted ${formatRelative(r.submittedAt)}`,
      badge: <MetaBadge meta={VERIFICATION_STATUS[r.status]} />,
    }))

  const reportItems: QueueItem[] = (reports.data ?? [])
    .filter((r) => isOpenReport(r.status))
    .sort((a, b) => Number(b.reason === "scam-concern") - Number(a.reason === "scam-concern"))
    .slice(0, PREVIEW)
    .map((r) => ({
      id: r.id,
      to: `${PATHS.admin.reports}?review=${r.id}`,
      lead: <UserAvatar name={r.reporterName} />,
      title: REPORT_REASONS[r.reason].label,
      detail: `${r.listingName}. Filed ${formatRelative(r.createdAt)}`,
      badge: <MetaBadge meta={REPORT_STATUS[r.status]} />,
    }))

  return (
    <div className="w-full space-y-8 pb-10">
      <AdminPageHeader
        title="Overview"
        description="What needs a decision, and how the marketplace is doing."
        metric={
          <HeaderMetric
            loading={isPending}
            value={formatNumber(waiting)}
            label="Awaiting review"
            detail={isPending ? undefined : waiting ? `${pluralize(waiting, "item")} across three queues` : "All queues clear"}
          />
        }
      />

      {/* Work first. Activity supplies context, never competes with reviews. */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)] lg:gap-12">
        <section aria-labelledby="review-desk-title" className="min-w-0">
          <SectionHeading
            id="review-desk-title"
            title="Review desk"
          />
          <div className="space-y-0">
            <Queue
              title="Listings to review"
              hint="Target: within 48 hours"
              to={PATHS.admin.listings}
              count={data?.queue.listings}
              items={listingItems}
              loading={moderation.isPending}
              error={moderation.isError}
            />
            <Queue
              title="Verifications waiting"
              hint="Identity, contact and property. Oldest first."
              to={PATHS.admin.verifications}
              count={data?.queue.verifications}
              items={verificationItems}
              loading={verifications.isPending}
              error={verifications.isError}
            />
            <Queue
              title="Open reports"
              hint="Scam reports first"
              to={PATHS.admin.reports}
              count={data?.queue.reports}
              items={reportItems}
              loading={reports.isPending}
              error={reports.isError}
            />
          </div>
        </section>

        <section aria-labelledby="activity-title" className="min-w-0 lg:border-l lg:border-border/80 lg:pl-10">
          <SectionHeading
            id="activity-title"
            title="Recent activity"
          />
          {isPending ? (
            <div className="space-y-3" aria-label="Loading platform activity">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : data && data.activity.length > 0 ? (
            <ol className="divide-y divide-border/70 border-y border-border/70">
              {data.activity.slice(0, 7).map((activity) => {
                const contents = (
                  <>
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ACTIVITY_DOT[activity.kind])} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-foreground">{activity.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{activity.detail}</span>
                      <span className="mt-1.5 block text-caption tabular-nums text-muted-foreground">{formatRelative(activity.at)}</span>
                    </span>
                    {activity.href && <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />}
                  </>
                )
                return (
                  <li key={activity.id}>
                    {activity.href ? (
                      <Link
                        to={activity.href}
                        className="group flex gap-3 rounded-sm px-1 py-3.5 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring motion-reduce:transition-none"
                      >
                        {contents}
                      </Link>
                    ) : (
                      <div className="flex gap-3 px-1 py-3.5">{contents}</div>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="border-t border-border/70 py-4 text-sm text-muted-foreground">No recent activity.</p>
          )}
        </section>
      </div>

      {/* Full-width stat strip: information without a wall of KPI cards. */}
      <section aria-labelledby="platform-title" className="min-w-0">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="platform-title"
            title="Platform snapshot"
          />
          <Link
            to={PATHS.admin.analytics}
            className="group mb-6 inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none"
          >
            Explore analytics
            <ArrowUpRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </div>
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading platform metrics">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-md" />)}
          </div>
        ) : data && data.metrics.length > 0 ? (
          <ul className="grid grid-cols-1 border-y border-border/80 sm:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => {
              const up = metric.delta >= 0
              const Trend = up ? TrendingUp : TrendingDown
              return (
                <li key={metric.id} className="min-w-0 border-b border-border/70 px-1 py-5 last:border-b-0 sm:px-5 sm:odd:border-r xl:border-b-0 xl:border-r xl:first:pl-0 xl:last:border-r-0 xl:last:pr-0">
                  <p className="truncate text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <span className="min-w-0 font-display text-metric text-foreground">
                      {formatNumber(metric.value)}
                    </span>
                    <Sparkline values={metric.series} className="w-20 shrink-0 sm:w-24" label={`${metric.label}, last 12 weeks`} />
                  </div>
                  <div className={cn("mt-4 inline-flex items-center gap-1.5 text-xs font-medium tabular-nums", up ? "text-success" : "text-destructive")}>
                    <Trend className="size-3.5" aria-hidden="true" />
                    {formatSignedPercent(metric.delta)}
                    <span className="font-normal text-muted-foreground">in 30 days</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="border-t border-border/70 py-4 text-sm text-muted-foreground">No platform metrics available.</p>
        )}
      </section>
    </div>
  )
}

export { AdminOverviewPage as Component }
