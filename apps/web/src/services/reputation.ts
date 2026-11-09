import type { ResidenceAspect, ResponseStats, Review, ViewingAspect } from "@/types"
import { db } from "./mock/db"

/**
 * Landlord reputation, worked out from stored records only. Nothing here is typed in
 * by hand, and a figure is left out rather than guessed when there isn't enough data.
 */

// ---------------------------------------------------------------- responsiveness

/** Inquiries from this many days back count. */
export const RESPONSE_WINDOW_DAYS = 90
/** A reply within this many hours counts as a response. */
export const RESPONSE_DEADLINE_HOURS = 24
/** Fewer inquiries than this and no figure is shown. */
export const MIN_INQUIRIES_TO_MEASURE = 3

const HOUR = 60 * 60 * 1000

/**
 * - Counts each inquiry once, from the renter's first message.
 * - A response is the landlord's first message after it that a person wrote; automated
 *   messages (like the demo's simulated replies) don't count.
 * - Inquiries younger than the deadline that haven't been answered yet are left out, since
 *   it's too early to say.
 */
export function responseStats(landlordId: string, now = Date.now()): ResponseStats {
  const landlord = db.landlordProfiles.find((l) => l.id === landlordId)
  if (!landlord) return { sample: 0, measured: false }
  const since = now - RESPONSE_WINDOW_DAYS * 24 * HOUR
  const delays: (number | null)[] = []

  for (const inquiry of db.inquiries) {
    if (inquiry.landlordId !== landlordId) continue
    const first = inquiry.messages.find((m) => m.senderId === inquiry.renterId)
    if (!first) continue
    const asked = Date.parse(first.sentAt)
    if (asked < since) continue
    const reply = inquiry.messages.find(
      (m) => m.senderId === landlord.userId && !m.automated && Date.parse(m.sentAt) >= asked,
    )
    if (reply) delays.push((Date.parse(reply.sentAt) - asked) / HOUR)
    else if (now - asked >= RESPONSE_DEADLINE_HOURS * HOUR) delays.push(null)
  }

  const sample = delays.length
  if (sample < MIN_INQUIRIES_TO_MEASURE) return { sample, measured: false }
  const answered = delays.filter((d): d is number => d !== null).sort((a, b) => a - b)
  const mid = Math.floor(answered.length / 2)
  const median = answered.length
    ? answered.length % 2
      ? answered[mid]
      : (answered[mid - 1] + answered[mid]) / 2
    : undefined
  return {
    sample,
    measured: true,
    rate: answered.filter((d) => d <= RESPONSE_DEADLINE_HOURS).length / sample,
    medianHours: median,
  }
}

// ---------------------------------------------------------------- ratings

/** Fewer reviews than this and no average is shown, only the reviews themselves. */
export const MIN_REVIEWS_FOR_AVERAGE = 3

export interface AspectScore {
  average: number
  count: number
}

export interface KindSummary<A extends string> {
  count: number
  /** Only when count reaches MIN_REVIEWS_FOR_AVERAGE. */
  average?: number
  /** Reviews per star, index 0 is one star. */
  distribution: [number, number, number, number, number]
  /** Only aspects rated in enough reviews. */
  aspects: Partial<Record<A, AspectScore>>
}

export interface RatingSummary {
  /** From people who lived there, after a stay both sides confirmed. */
  residence: KindSummary<ResidenceAspect> & { recommendShare?: number }
  /** From people who visited, after a viewing the landlord marked completed. Kept apart on purpose. */
  viewing: KindSummary<ViewingAspect>
}

const round1 = (n: number) => Math.round(n * 10) / 10

function summarizeKind<A extends string>(reviews: Review[]): KindSummary<A> {
  const distribution: KindSummary<A>["distribution"] = [0, 0, 0, 0, 0]
  const totals: Record<string, { sum: number; count: number }> = {}
  for (const r of reviews) {
    distribution[r.overall - 1] += 1
    for (const [aspect, value] of Object.entries(r.aspects)) {
      if (!value) continue
      totals[aspect] ??= { sum: 0, count: 0 }
      totals[aspect].sum += value
      totals[aspect].count += 1
    }
  }
  const enough = reviews.length >= MIN_REVIEWS_FOR_AVERAGE
  const aspects = Object.fromEntries(
    Object.entries(totals)
      .filter(([, t]) => t.count >= MIN_REVIEWS_FOR_AVERAGE)
      .map(([aspect, t]) => [aspect, { average: round1(t.sum / t.count), count: t.count }]),
  ) as Partial<Record<A, AspectScore>>
  return {
    count: reviews.length,
    average: enough ? round1(reviews.reduce((s, r) => s + r.overall, 0) / reviews.length) : undefined,
    distribution,
    aspects,
  }
}

/** Summarizes published reviews only. Held and hidden reviews never count. */
export function summarize(reviews: Review[]): RatingSummary {
  const published = reviews.filter((r) => r.status === "published")
  const residence = published.filter((r) => r.kind === "residence")
  const recommended = residence.filter((r) => r.recommend !== undefined)
  return {
    residence: {
      ...summarizeKind<ResidenceAspect>(residence),
      recommendShare:
        recommended.length >= MIN_REVIEWS_FOR_AVERAGE
          ? recommended.filter((r) => r.recommend).length / recommended.length
          : undefined,
    },
    viewing: summarizeKind<ViewingAspect>(published.filter((r) => r.kind === "viewing")),
  }
}

export const landlordSummary = (landlordId: string) => summarize(db.reviews.filter((r) => r.landlordId === landlordId))
export const propertySummary = (listingId: string) => summarize(db.reviews.filter((r) => r.listingId === listingId))
