import type { Rental, RentalPhase, ReviewKind, ViewingRequest } from "@/types"
import { todayIso } from "@/lib/format"
import { db } from "./mock/db"

/**
 * Who may review what. Decided only from stored rentals and viewings, never from what a
 * page sends. The real API must apply the same rules (docs/backend-integration.md).
 */

/** Days a confirmed stay must last before the renter can review it, unless it has ended. */
export const RESIDENCE_MIN_DAYS = 30
/** How long after a completed viewing the renter can still review it. */
export const VIEWING_REVIEW_WINDOW_DAYS = 90

const DAY = 24 * 60 * 60 * 1000

/** Today in the user's local calendar (Philippine time for real users), as yyyy-MM-dd. */
export const today = () => todayIso()
const toDay = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
export const daysBetween = (from: string, to: string) => Math.round((toDay(to) - toDay(from)) / DAY)
export const addDays = (iso: string, days: number) => new Date(toDay(iso) + days * DAY).toISOString().slice(0, 10)

export type Eligibility =
  | { state: "eligible" }
  | { state: "reviewed"; reviewId: string }
  /** Not yet: the renter can review from this date. */
  | { state: "not-yet"; from: string }
  | { state: "unavailable"; reason: string }

export function existingReview(kind: ReviewKind, sourceId: string) {
  return db.reviews.find((r) => r.kind === kind && r.sourceId === sourceId)
}

export function rentalPhase(rental: Rental, on = today()): RentalPhase {
  switch (rental.status) {
    case "pending":
      return "pending"
    case "disputed":
      return "disputed"
    case "declined":
    case "cancelled":
    case "void":
      return "closed"
    case "ended":
      return "past"
    case "confirmed":
      return rental.startDate > on ? "upcoming" : "current"
  }
}

export function residenceEligibility(rental: Rental, on = today()): Eligibility {
  const done = existingReview("residence", rental.id)
  if (done?.status === "withdrawn") return { state: "unavailable", reason: "You deleted your review of this stay." }
  if (done) return { state: "reviewed", reviewId: done.id }
  if (rental.status === "disputed") return { state: "unavailable", reason: "This stay is under review by Abong." }
  if (rental.status !== "confirmed" && rental.status !== "ended") {
    return { state: "unavailable", reason: "Only stays both of you confirmed can be reviewed." }
  }
  if (rental.startDate > on) return { state: "not-yet", from: addDays(rental.startDate, RESIDENCE_MIN_DAYS) }
  // An ended stay can be reviewed however short it was: short stays that go badly matter most.
  if (rental.status === "ended") return { state: "eligible" }
  const ready = addDays(rental.startDate, RESIDENCE_MIN_DAYS)
  return ready <= on ? { state: "eligible" } : { state: "not-yet", from: ready }
}

export function viewingEligibility(viewing: ViewingRequest, on = today()): Eligibility {
  const done = existingReview("viewing", viewing.id)
  if (done?.status === "withdrawn") return { state: "unavailable", reason: "You deleted your review of this viewing." }
  if (done) return { state: "reviewed", reviewId: done.id }
  // "Completed" is set by the landlord after the visit; the renter's review is their side of it.
  if (viewing.status !== "completed" || viewing.date > on) {
    return { state: "unavailable", reason: "Only viewings marked as completed can be reviewed." }
  }
  if (daysBetween(viewing.date, on) > VIEWING_REVIEW_WINDOW_DAYS) {
    return { state: "unavailable", reason: `Viewings can be reviewed for ${VIEWING_REVIEW_WINDOW_DAYS} days.` }
  }
  return { state: "eligible" }
}
