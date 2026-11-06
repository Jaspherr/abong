import { useQuery } from "@tanstack/react-query"
import { BarList, TrendChart } from "@/components/charts/trend-chart"
import { ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PROPERTY_TYPES } from "@/constants/listing"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatPercent } from "@/lib/format"
import { qk } from "@/lib/query"
import { adminService } from "@/services"
import type { PropertyType } from "@/types"

const week = (index: number, total: number) =>
  index === total - 1 ? "This wk" : `${total - 1 - index}w`

const series = (values: number[]) =>
  values.map((value, index) => ({ label: week(index, values.length), value }))

/** Shared editorial heading treatment used throughout the redesigned Admin experience. */
function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="type-subsection">
      {title}
    </h2>
  )
}

/** The metrics stay compact and legible, without competing with the actual charts. */
function HealthMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <li className="min-w-0 border-b border-border/70 px-1 py-5 last:border-b-0 sm:px-5 sm:odd:border-r sm:last:col-span-2 sm:last:border-r-0 lg:col-span-1 lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-metric text-foreground">
        {value}
      </p>
      <p className="mt-3 max-w-[32ch] text-xs leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </li>
  )
}

function AnalyticsPage() {
  useDocumentTitle("Analytics")

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.analytics,
    queryFn: adminService.getAnalytics,
  })

  if (isError) return <ErrorState onRetry={() => refetch()} />

  const charts = data
    ? [
        { title: "Sign-ups", data: series(data.weekly.signups) },
        { title: "Inquiries sent", data: series(data.weekly.inquiries) },
        { title: "Viewings requested", data: series(data.weekly.viewings) },
        { title: "New listings", data: series(data.weekly.newListings) },
      ]
    : []

  return (
    <div className="w-full space-y-8 pb-10">
      {/* Keep the demo-data disclaimer visible; do not imply these are live figures. */}
      <AdminPageHeader
        title="Analytics"
        description="How the marketplace is moving, from new listings to renter activity. Demo figures for illustration, not live reporting."
        metric={<HeaderMetric value="12 weeks" label="Reporting window" />}
      />

      <section className="min-w-0 space-y-6" aria-labelledby="marketplace-health-title">
        <SectionHeading
          id="marketplace-health-title"
          title="Marketplace health"
        />

        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading marketplace health metrics">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-36 w-full rounded-md" />
            ))}
          </div>
        ) : data ? (
          <ul className="grid grid-cols-1 border-y border-border/80 sm:grid-cols-2 lg:grid-cols-3">
            <HealthMetric
              label="Bed occupancy (active listings)"
              value={formatPercent(data.occupancy)}
              detail="Beds taken across live listings"
            />
            <HealthMetric
              label="Inquiry to viewing"
              value={formatPercent(data.inquiryToViewing)}
              detail="Share of inquiries that lead to a viewing request"
            />
            <HealthMetric
              label="Median landlord reply"
              value={`${data.medianResponseHours} h`}
              detail="Time to first reply on new inquiries"
            />
          </ul>
        ) : null}
      </section>

      <section className="min-w-0 space-y-6" aria-labelledby="weekly-trends-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="weekly-trends-title"
            title="Weekly trends"
          />
          <span className="shrink-0 text-caption font-medium text-muted-foreground">
            Activity / week
          </span>
        </div>

        {isPending ? (
          <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2" aria-label="Loading weekly trends">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid min-w-0 gap-x-10 gap-y-8 xl:grid-cols-2">
            {charts.map((chart) => (
              <section
                key={chart.title}
                aria-label={`${chart.title} per week`}
                className="min-w-0 border-t border-border/80 pt-5"
              >
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                    {chart.title}
                  </h3>
                </div>
                <div className="min-w-0">
                  <TrendChart
                    title={`${chart.title} per week`}
                    data={chart.data}
                    height={200}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-6" aria-labelledby="listing-distribution-title">
        <SectionHeading
          id="listing-distribution-title"
          title="Listing distribution"
        />

        {isPending ? (
          <div className="grid gap-6 xl:grid-cols-2" aria-label="Loading listing distribution">
            <Skeleton className="h-60 w-full rounded-md" />
            <Skeleton className="h-60 w-full rounded-md" />
          </div>
        ) : data ? (
          <div className="grid min-w-0 gap-x-10 gap-y-8 xl:grid-cols-2">
            <section className="min-w-0 border-t border-border/80 pt-5" aria-labelledby="by-town-title">
              <h3 id="by-town-title" className="mb-6 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                Active listings by town
              </h3>
              <BarList data={data.byTown} />
            </section>
            <section className="min-w-0 border-t border-border/80 pt-5" aria-labelledby="by-type-title">
              <h3 id="by-type-title" className="mb-6 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                Active listings by type
              </h3>
              <BarList
                data={data.byType.map((item) => ({
                  label: PROPERTY_TYPES[item.type as PropertyType].plural,
                  value: item.value,
                }))}
              />
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export { AnalyticsPage as Component }
