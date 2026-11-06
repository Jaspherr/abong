import { isToday, isTomorrow, parseISO } from "date-fns"
import { CalendarDays } from "lucide-react"
import { useMemo, useState } from "react"
import { LineTabs } from "@/components/common/line-tabs"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { useLandlordViewings } from "@/features/landlord/queries"
import { LandlordViewingRow } from "@/features/viewings/landlord-viewing-row"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate } from "@/lib/format"
import type { ViewingWithContext } from "@/services"
import type { ViewingStatus } from "@/types"

type Tab = "pending" | "upcoming" | "past"

const TAB_MATCH: Record<Tab, (s: ViewingStatus) => boolean> = {
  pending: (s) => s === "pending",
  upcoming: (s) => s === "confirmed",
  past: (s) => s === "completed" || s === "declined" || s === "cancelled",
}

const EMPTY: Record<Tab, { title: string; description: string }> = {
  pending: { title: "No requests waiting", description: "New requests from renters show up here first." },
  upcoming: { title: "No viewings coming up", description: "Viewings you confirm are listed here by day." },
  past: { title: "No past viewings yet", description: "Completed, declined and cancelled viewings will be listed here." },
}

function dayLabel(date: string) {
  const day = parseISO(date)
  const prefix = isToday(day) ? "Today, " : isTomorrow(day) ? "Tomorrow, " : ""
  return `${prefix}${formatDate(day, prefix ? "MMM d" : "EEEE, MMM d")}`
}

/** Consecutive viewings on the same date, keeping the list's order. */
function byDay(viewings: ViewingWithContext[]) {
  const days: { date: string; viewings: ViewingWithContext[] }[] = []
  for (const viewing of viewings) {
    const last = days.at(-1)
    if (last?.date === viewing.date) last.viewings.push(viewing)
    else days.push({ date: viewing.date, viewings: [viewing] })
  }
  return days
}

function LandlordViewingsPage() {
  useDocumentTitle("Viewing requests")
  const { data, isPending, isError, refetch } = useLandlordViewings()
  const [tab, setTab] = useState<Tab>("pending")
  const count = (t: Tab) => (data ?? []).filter((v) => TAB_MATCH[t](v.status)).length
  const days = useMemo(() => {
    const rows = (data ?? []).filter((v) => TAB_MATCH[tab](v.status))
    return byDay(tab === "past" ? rows.reverse() : rows)
  }, [data, tab])

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Viewing requests" description="Confirm quickly. Renters often book the first place that replies." />
      <LineTabs
        label="Viewing requests"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Needs reply", count: data && count("pending") },
          { value: "upcoming", label: "Upcoming", count: data && count("upcoming") },
          { value: "past", label: "Past" },
        ]}
      />
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState compact icon={CalendarDays} title={EMPTY[tab].title} description={EMPTY[tab].description} />
        </div>
      ) : (
        <div className="space-y-7">
          {days.map((day) => (
            <section key={day.date} aria-label={dayLabel(day.date)} className="space-y-2.5">
              <h2 className="font-sans text-sm font-semibold">{dayLabel(day.date)}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {day.viewings.map((v) => (
                  <li key={v.id}>
                    <LandlordViewingRow viewing={v} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export { LandlordViewingsPage as Component }
