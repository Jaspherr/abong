import { formatPercent } from "@/lib/format"
import type { ResponseStats } from "@/types"

export const reviewErrorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.")

/** Plain-language reply figures, or nothing when there wasn't enough to measure. */
export function describeResponse(stats: ResponseStats) {
  if (!stats.measured || stats.rate === undefined) return null
  const h = stats.medianHours
  const time =
    h === undefined
      ? undefined
      : h < 1
        ? "Usually replies within an hour"
        : h < 24
          ? `Usually replies in about ${Math.round(h)} ${Math.round(h) === 1 ? "hour" : "hours"}`
          : `Usually replies in about ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "day" : "days"}`
  return { rate: `Replies to ${formatPercent(stats.rate)} of inquiries within a day`, time }
}

