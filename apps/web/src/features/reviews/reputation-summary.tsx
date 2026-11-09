import { Clock, MessageCircleReply } from "lucide-react"
import { REVIEW_ASPECTS, REVIEW_KIND } from "@/constants/reviews"
import { formatPercent, pluralize } from "@/lib/format"
import { describeResponse } from "./review-utils"
import { cn } from "@/lib/utils"
import type { KindSummary, RatingSummary } from "@/services"
import type { ResponseStats, ReviewAspect } from "@/types"
import { Stars } from "./stars"

/** Response rate and typical reply time, measured from the last 90 days of inquiries. */
export function ResponseFacts({ stats, className }: { stats: ResponseStats; className?: string }) {
  const lines = describeResponse(stats)
  if (!lines) {
    return (
      <p className={cn("flex items-start gap-2.5 text-sm text-muted-foreground", className)}>
        <MessageCircleReply className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Not enough recent inquiries to measure replies yet.
      </p>
    )
  }
  return (
    <div className={className}>
      <ul className="space-y-2.5 text-sm">
        <li className="flex items-start gap-2.5">
          <MessageCircleReply className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {lines.rate}
        </li>
        {lines.time && (
          <li className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {lines.time}
          </li>
        )}
      </ul>
      <p className="mt-2 text-caption text-muted-foreground">
        From {pluralize(stats.sample, "inquiry", "inquiries")} in the last 90 days. Automated replies don't count.
      </p>
    </div>
  )
}

function Distribution({ distribution, label }: { distribution: KindSummary<string>["distribution"]; label: string }) {
  const total = distribution.reduce((s, n) => s + n, 0)
  return (
    <dl aria-label={label} className="grid grid-cols-[auto_minmax(0,1fr)_2ch] items-center gap-x-2.5 gap-y-1 text-caption">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1]
        return (
          <div key={star} className="contents">
            <dt className="text-muted-foreground tabular">
              {star} {star === 1 ? "star" : "stars"}
            </dt>
            <dd className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-foreground/70" style={{ width: total ? `${(count / total) * 100}%` : 0 }} />
            </dd>
            <dd className="text-right tabular">{count}</dd>
          </div>
        )
      })}
    </dl>
  )
}

function KindBlock({
  kind,
  summary,
  recommendShare,
}: {
  kind: "residence" | "viewing"
  summary: KindSummary<ReviewAspect>
  recommendShare?: number
}) {
  const meta = REVIEW_KIND[kind]
  const aspects = Object.entries(summary.aspects) as [ReviewAspect, { average: number; count: number }][]
  return (
    <section aria-label={meta.label} className="min-w-0 space-y-3">
      <div>
        <h3 className="text-meta font-semibold">{meta.label}</h3>
        <p className="text-caption text-muted-foreground">{meta.description}</p>
      </div>
      {summary.average !== undefined ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display text-metric tabular">{summary.average.toFixed(1)}</span>
            <Stars value={summary.average} />
            <span className="text-meta text-muted-foreground">{pluralize(summary.count, "review")}</span>
          </div>
          <Distribution distribution={summary.distribution} label={`${meta.label} by stars`} />
          {aspects.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-meta sm:grid-cols-2">
              {aspects.map(([aspect, score]) => (
                <div key={aspect} className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-1.5">
                  <dt className="truncate text-muted-foreground">{REVIEW_ASPECTS[aspect].label}</dt>
                  <dd className="font-semibold tabular">{score.average.toFixed(1)}</dd>
                </div>
              ))}
            </dl>
          )}
          {recommendShare !== undefined && (
            <p className="text-meta text-muted-foreground">{formatPercent(recommendShare)} would recommend living here</p>
          )}
        </>
      ) : (
        <p className="text-meta text-muted-foreground">
          {pluralize(summary.count, kind === "residence" ? "resident review" : "viewing review")} so far. An average appears from 3
          reviews.
        </p>
      )}
    </section>
  )
}

/**
 * Ratings kept in two groups: people who lived there and people who only visited.
 * With no reviews at all it says so plainly instead of showing a score of zero.
 */
export function ReputationSummary({ summary, newLandlord }: { summary: RatingSummary; newLandlord?: boolean }) {
  const { residence, viewing } = summary
  if (residence.count + viewing.count === 0) {
    return (
      <p className="text-body text-muted-foreground">
        {newLandlord ? "New landlord, no reviews yet." : "No reviews yet."} Reviews come only from renters who stayed or
        visited through a confirmed stay or viewing.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {residence.count > 0 && <KindBlock kind="residence" summary={residence} recommendShare={residence.recommendShare} />}
      {viewing.count > 0 && <KindBlock kind="viewing" summary={viewing} />}
    </div>
  )
}
