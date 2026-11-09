import type {
  LandlordResponse,
  NotificationKind,
  Rental,
  ResidenceAspect,
  Review,
  ReviewAspect,
  ReviewKind,
  ReviewReport,
  ReviewReportReason,
  User,
  ViewingAspect,
  ViewingRequest,
} from "@/types"
import { formatDate } from "@/lib/format"
import { recordDecision, requireNote } from "./audit"
import { db, nextId } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"
import { requireAdmin, requireUser, sessionUser } from "./mock/session"
import { landlordSummary, propertySummary, type RatingSummary } from "./reputation"
import { residenceEligibility, viewingEligibility, type Eligibility } from "./review-eligibility"

/**
 * Reviews. A renter can review only a stay both sides confirmed (after 30 days, or once it
 * ends) or a viewing the landlord marked completed, once each. Landlords can reply in public
 * but can't edit, hide or delete a review; only an admin can hide one, with a recorded reason.
 */

export const VIEWING_ASPECTS: ViewingAspect[] = ["reliability", "punctuality", "communication", "accuracy"]
export const RESIDENCE_ASPECTS: ResidenceAspect[] = ["communication", "accuracy", "maintenance", "professionalism"]
const ASPECTS: Record<ReviewKind, ReviewAspect[]> = { viewing: VIEWING_ASPECTS, residence: RESIDENCE_ASPECTS }

export const REVIEW_BODY = { min: 20, max: 1500 } as const
export const RESPONSE_BODY = { min: 10, max: 1000 } as const

/** What anyone may read about a review. The author is shown as first name and initial only. */
export interface PublicReview {
  id: string
  kind: ReviewKind
  listingId: string
  propertyName: string
  overall: number
  aspects: Partial<Record<ReviewAspect, number>>
  recommend?: boolean
  body?: string
  createdAt: string
  editedAt?: string
  response?: LandlordResponse
  authorLabel: string
  /** For the signed-in viewer. */
  mine: boolean
  canRespond: boolean
  canReport: boolean
}

export interface ReviewsPage {
  summary: RatingSummary
  reviews: PublicReview[]
}

/** A stay or viewing the renter can review, or will be able to. */
export interface ReviewOpportunity {
  kind: ReviewKind
  sourceId: string
  listingId: string
  propertyName: string
  landlordName: string
  /** Move-in date for a stay, visit date for a viewing. */
  date: string
  eligibility: Eligibility
}

export interface MyReview extends PublicReview {
  status: Review["status"]
  landlordName: string
}

const PHONE = /(?:\+?63|\b0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i

/** Keeps phone numbers and email addresses out of public text. */
function checkText(text: string | undefined, limits: { min: number; max: number }, what: string, required: boolean) {
  const trimmed = text?.trim() ?? ""
  if (!trimmed) {
    if (required) throw new ServiceError("invalid", `Write your ${what}.`)
    return undefined
  }
  if (trimmed.length < limits.min) throw new ServiceError("invalid", `Write a bit more (${limits.min}+ characters), or leave it empty.`)
  if (trimmed.length > limits.max) throw new ServiceError("invalid", `Keep it under ${limits.max} characters.`)
  if (PHONE.test(trimmed) || EMAIL.test(trimmed)) {
    throw new ServiceError("invalid", "Remove phone numbers and email addresses. Reviews are public.")
  }
  return trimmed
}

const isStar = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5

function checkRatings(kind: ReviewKind, overall: number, aspects: Partial<Record<ReviewAspect, number>>) {
  if (!isStar(overall)) throw new ServiceError("invalid", "Choose an overall rating from 1 to 5 stars.")
  const allowed = ASPECTS[kind]
  const clean: Partial<Record<ReviewAspect, number>> = {}
  for (const [aspect, value] of Object.entries(aspects) as [ReviewAspect, number | undefined][]) {
    if (value === undefined || value === null) continue
    if (!allowed.includes(aspect)) {
      throw new ServiceError("invalid", kind === "viewing" ? "A viewing can't be rated on that." : "That isn't something you can rate.")
    }
    if (!isStar(value)) throw new ServiceError("invalid", "Ratings go from 1 to 5 stars.")
    clean[aspect] = value
  }
  return clean
}

const firstNameInitial = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0]}.` : first
}

function toPublic(review: Review, viewer: User | undefined): PublicReview {
  const author = db.users.find((u) => u.id === review.authorId)
  const landlordUser = db.landlordProfiles.find((l) => l.id === review.landlordId)?.userId
  const mine = viewer?.id === review.authorId
  const alreadyReported = db.reviewReports.some((r) => r.reviewId === review.id && r.reporterId === viewer?.id && r.status === "open")
  return {
    id: review.id,
    kind: review.kind,
    listingId: review.listingId,
    propertyName: review.propertyName,
    overall: review.overall,
    aspects: review.aspects,
    recommend: review.recommend,
    body: review.body,
    createdAt: review.createdAt,
    editedAt: review.editedAt,
    response: review.response,
    authorLabel: author ? firstNameInitial(author.name) : "Former renter",
    mine,
    canRespond: !!viewer && viewer.id === landlordUser && review.status === "published",
    canReport: !!viewer && !mine && !alreadyReported,
  }
}

const newestFirst = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt)

function notify(userId: string | undefined, kind: NotificationKind, title: string, body: string, href: string) {
  if (!userId) return
  db.notifications.push({ id: nextId("n"), userId, kind, title, body, href, createdAt: new Date().toISOString(), read: false })
}

function ownReview(user: User, id: string) {
  const review = db.reviews.find((r) => r.id === id) ?? notFound("Review")
  if (review.authorId !== user.id) throw new ServiceError("forbidden", "You can only change your own reviews.")
  return review
}

function opportunityFromRental(r: Rental): ReviewOpportunity {
  return {
    kind: "residence",
    sourceId: r.id,
    listingId: r.listingId,
    propertyName: r.propertyName,
    landlordName: db.landlordProfiles.find((l) => l.id === r.landlordId)?.displayName ?? "Landlord",
    date: r.startDate,
    eligibility: residenceEligibility(r),
  }
}

function opportunityFromViewing(v: ViewingRequest): ReviewOpportunity {
  return {
    kind: "viewing",
    sourceId: v.id,
    listingId: v.listingId,
    propertyName: db.properties.find((p) => p.id === v.listingId)?.name ?? "Property",
    landlordName: db.landlordProfiles.find((l) => l.id === v.landlordId)?.displayName ?? "Landlord",
    date: v.date,
    eligibility: viewingEligibility(v),
  }
}

export const reviewsService = {
  /** Published reviews of everything a landlord rents out, with the landlord-wide summary. */
  listForLandlord(landlordId: string): Promise<ReviewsPage> {
    return respond(() => {
      const viewer = sessionUser()
      return {
        summary: landlordSummary(landlordId),
        reviews: db.reviews
          .filter((r) => r.landlordId === landlordId && r.status === "published")
          .sort(newestFirst)
          .map((r) => toPublic(r, viewer)),
      }
    })
  },

  /** Published reviews of one property, with that property's own summary. */
  listForListing(listingId: string): Promise<ReviewsPage> {
    return respond(() => {
      const viewer = sessionUser()
      return {
        summary: propertySummary(listingId),
        reviews: db.reviews
          .filter((r) => r.listingId === listingId && r.status === "published")
          .sort(newestFirst)
          .map((r) => toPublic(r, viewer)),
      }
    })
  },

  /** For the signed-in renter: stays and viewings they can review now or later. Closed ones are left out. */
  myOpportunities(): Promise<ReviewOpportunity[]> {
    return respond(() => {
      const user = requireUser()
      if (user.role !== "renter") return []
      const stays = db.rentals.filter((r) => r.renterId === user.id).map(opportunityFromRental)
      const visits = db.viewings.filter((v) => v.renterId === user.id && v.status === "completed").map(opportunityFromViewing)
      return [...stays, ...visits].filter((o) => o.eligibility.state !== "unavailable")
    })
  },

  /** Whether the signed-in renter can review one stay or viewing. */
  eligibility(kind: ReviewKind, sourceId: string): Promise<ReviewOpportunity> {
    return respond(() => {
      const user = requireUser()
      if (kind === "residence") {
        const rental = db.rentals.find((r) => r.id === sourceId && r.renterId === user.id) ?? notFound("Stay")
        return opportunityFromRental(rental)
      }
      const viewing = db.viewings.find((v) => v.id === sourceId && v.renterId === user.id) ?? notFound("Viewing")
      return opportunityFromViewing(viewing)
    }, 120)
  },

  /** The signed-in renter's own reviews, including held and hidden ones, so they know where each stands. */
  listMine(): Promise<MyReview[]> {
    return respond(() => {
      const user = requireUser()
      return db.reviews
        .filter((r) => r.authorId === user.id && r.status !== "withdrawn")
        .sort(newestFirst)
        .map((r) => ({
          ...toPublic(r, user),
          status: r.status,
          landlordName: db.landlordProfiles.find((l) => l.id === r.landlordId)?.displayName ?? "Landlord",
        }))
    })
  },

  create(input: {
    kind: ReviewKind
    sourceId: string
    overall: number
    aspects: Partial<Record<ReviewAspect, number>>
    recommend?: boolean
    body?: string
  }): Promise<MyReview> {
    return respond(() => {
      const user = requireUser()
      if (user.role !== "renter") throw new ServiceError("forbidden", "Only renters can write reviews.")
      let source: { landlordId: string; listingId: string; propertyName: string; eligibility: Eligibility }
      if (input.kind === "residence") {
        const rental = db.rentals.find((r) => r.id === input.sourceId && r.renterId === user.id) ?? notFound("Stay")
        source = { ...rental, eligibility: residenceEligibility(rental) }
      } else {
        const viewing = db.viewings.find((v) => v.id === input.sourceId && v.renterId === user.id) ?? notFound("Viewing")
        source = { ...viewing, propertyName: opportunityFromViewing(viewing).propertyName, eligibility: viewingEligibility(viewing) }
      }
      const e = source.eligibility
      if (e.state === "reviewed") throw new ServiceError("invalid", "You've already reviewed this. You can edit that review instead.")
      // Covers deleted reviews too: a deleted review can't be replaced by a new one.
      if (e.state === "not-yet") throw new ServiceError("invalid", `You can review this stay from ${formatDate(e.from, "MMMM d, yyyy")}.`)
      if (e.state === "unavailable") throw new ServiceError("forbidden", e.reason)
      // A landlord can't review their own property, even from a renter account they also hold.
      const landlordUser = db.landlordProfiles.find((l) => l.id === source.landlordId)?.userId
      if (landlordUser === user.id) throw new ServiceError("forbidden", "You can't review your own property.")

      const aspects = checkRatings(input.kind, input.overall, input.aspects)
      const review: Review = {
        id: nextId("rv"),
        kind: input.kind,
        sourceId: input.sourceId,
        authorId: user.id,
        landlordId: source.landlordId,
        listingId: source.listingId,
        overall: input.overall,
        aspects,
        recommend: input.kind === "residence" ? input.recommend : undefined,
        body: checkText(input.body, REVIEW_BODY, "review", false),
        status: "published",
        propertyName: source.propertyName,
        createdAt: new Date().toISOString(),
      }
      db.reviews.push(review)
      notify(
        landlordUser,
        "review",
        `New review of ${review.propertyName}`,
        `${firstNameInitial(user.name)} left ${review.overall} star${review.overall === 1 ? "" : "s"}. You can reply publicly.`,
        "/landlord/reviews",
      )
      return { ...toPublic(review, user), status: review.status, landlordName: "" }
    }, 450)
  },

  update(id: string, patch: { overall: number; aspects: Partial<Record<ReviewAspect, number>>; recommend?: boolean; body?: string }) {
    return respond(() => {
      const user = requireUser()
      const review = ownReview(user, id)
      if (review.status === "hidden") throw new ServiceError("forbidden", "Abong removed this review, so it can't be edited.")
      if (review.status === "withdrawn") throw new ServiceError("invalid", "This review was deleted.")
      review.aspects = checkRatings(review.kind, patch.overall, patch.aspects)
      review.overall = patch.overall
      review.recommend = review.kind === "residence" ? patch.recommend : undefined
      review.body = checkText(patch.body, REVIEW_BODY, "review", false)
      review.editedAt = new Date().toISOString()
      return toPublic(review, user)
    }, 400)
  },

  /**
   * The author deletes their own review. Its text, ratings and reply are erased, but a stub
   * stays so the same stay or viewing can't be reviewed again, and open reports are closed
   * with a note rather than dropped. A review Abong removed stays as the moderation record.
   */
  remove(id: string): Promise<void> {
    return respond(() => {
      const user = requireUser()
      const review = ownReview(user, id)
      if (review.status === "hidden") throw new ServiceError("forbidden", "Abong removed this review, so it can't be deleted.")
      if (review.status === "withdrawn") return
      Object.assign(review, {
        status: "withdrawn",
        withdrawnAt: new Date().toISOString(),
        overall: 0,
        aspects: {},
        recommend: undefined,
        body: undefined,
        response: undefined,
        editedAt: undefined,
      })
      db.reviewReports
        .filter((r) => r.reviewId === id && r.status === "open")
        .forEach((r) => Object.assign(r, { status: "dismissed", resolutionNote: "The author deleted the review." }))
    })
  },

  // ---------------------------------------------------------------- landlords

  /** Reviews of the signed-in landlord's properties, so they can reply. */
  listAboutMe(): Promise<ReviewsPage> {
    return respond(() => {
      const user = requireUser()
      const profile = db.landlordProfiles.find((l) => l.userId === user.id)
      if (!profile) throw new ServiceError("forbidden", "Only landlords have reviews to reply to.")
      return {
        summary: landlordSummary(profile.id),
        reviews: db.reviews
          .filter((r) => r.landlordId === profile.id && r.status === "published")
          .sort(newestFirst)
          .map((r) => toPublic(r, user)),
      }
    })
  },

  /** Adds or replaces the landlord's one public reply. */
  respond(id: string, body: string): Promise<PublicReview> {
    return respond(() => {
      const user = requireUser()
      const review = db.reviews.find((r) => r.id === id) ?? notFound("Review")
      const landlordUser = db.landlordProfiles.find((l) => l.id === review.landlordId)?.userId
      if (landlordUser !== user.id) throw new ServiceError("forbidden", "Only the landlord can reply to this review.")
      if (review.status !== "published") throw new ServiceError("invalid", "You can reply once the review is public.")
      const text = checkText(body, RESPONSE_BODY, "reply", true)!
      const now = new Date().toISOString()
      review.response = review.response ? { ...review.response, body: text, updatedAt: now } : { body: text, createdAt: now }
      notify(review.authorId, "review", `${db.landlordProfiles.find((l) => l.id === review.landlordId)?.displayName} replied to your review`, review.propertyName, "/overview")
      return toPublic(review, user)
    }, 400)
  },

  removeResponse(id: string): Promise<PublicReview> {
    return respond(() => {
      const user = requireUser()
      const review = db.reviews.find((r) => r.id === id) ?? notFound("Review")
      const landlordUser = db.landlordProfiles.find((l) => l.id === review.landlordId)?.userId
      if (landlordUser !== user.id) throw new ServiceError("forbidden", "Only the landlord can remove this reply.")
      review.response = undefined
      return toPublic(review, user)
    })
  },

  // ---------------------------------------------------------------- reports

  /** Anyone signed in except the author can report a review once; an admin decides. */
  report(id: string, reason: ReviewReportReason, details?: string): Promise<void> {
    return respond(() => {
      const user = requireUser()
      const review = db.reviews.find((r) => r.id === id && r.status === "published") ?? notFound("Review")
      if (review.authorId === user.id) throw new ServiceError("invalid", "You can edit or remove your own review instead.")
      if (db.reviewReports.some((r) => r.reviewId === id && r.reporterId === user.id && r.status === "open")) {
        throw new ServiceError("invalid", "You've already reported this review.")
      }
      const text = details?.trim()
      if (reason === "other" && (!text || text.length < 10)) throw new ServiceError("invalid", "Tell us what's wrong (at least 10 characters).")
      if (text && text.length > 1000) throw new ServiceError("invalid", "Keep it under 1000 characters.")
      const report: ReviewReport = {
        id: nextId("rr"),
        reviewId: id,
        reporterId: user.id,
        reason,
        details: text || undefined,
        status: "open",
        createdAt: new Date().toISOString(),
      }
      db.reviewReports.push(report)
    }, 400)
  },

  // ---------------------------------------------------------------- admin

  /** Reviews with open reports, oldest report first, with every open report on each. */
  listReported(): Promise<(Review & { authorName: string; landlordName: string; reports: (ReviewReport & { reporterName: string })[] })[]> {
    return respond(() => {
      requireAdmin()
      const open = db.reviewReports.filter((r) => r.status === "open")
      const ids = [...new Set(open.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((r) => r.reviewId))]
      return ids
        .map((id) => db.reviews.find((r) => r.id === id))
        .filter((r): r is Review => !!r)
        .map((r) => ({
          ...r,
          authorName: db.users.find((u) => u.id === r.authorId)?.name ?? "Unknown",
          landlordName: db.landlordProfiles.find((l) => l.id === r.landlordId)?.displayName ?? "Landlord",
          reports: open
            .filter((x) => x.reviewId === r.id)
            .map((x) => ({ ...x, reporterName: db.users.find((u) => u.id === x.reporterId)?.name ?? "Unknown" })),
        }))
    })
  },

  /** Reviews an admin hid, so they can be restored. */
  listHidden(): Promise<(Review & { authorName: string; landlordName: string })[]> {
    return respond(() => {
      requireAdmin()
      return db.reviews
        .filter((r) => r.status === "hidden")
        .sort(newestFirst)
        .map((r) => ({
          ...r,
          authorName: db.users.find((u) => u.id === r.authorId)?.name ?? "Unknown",
          landlordName: db.landlordProfiles.find((l) => l.id === r.landlordId)?.displayName ?? "Landlord",
        }))
    })
  },

  /**
   * Hide: the review breaks the rules (personal details, harassment, not genuine); its reports are upheld.
   * Keep: a critical but genuine review stays up; its reports are dismissed.
   */
  decide(id: string, action: "hide" | "keep", note: string): Promise<void> {
    return respond(() => {
      const admin = requireAdmin()
      const review = db.reviews.find((r) => r.id === id) ?? notFound("Review")
      const text = requireNote(note, 10, "Add a note explaining the decision (at least 10 characters).")
      const from = review.status
      if (action === "hide") review.status = "hidden"
      db.reviewReports
        .filter((r) => r.reviewId === id && r.status === "open")
        .forEach((r) => Object.assign(r, { status: action === "hide" ? "upheld" : "dismissed", resolutionNote: text }))
      recordDecision(admin, {
        area: "review",
        targetId: review.id,
        targetLabel: `${review.propertyName} review by ${firstNameInitial(db.users.find((u) => u.id === review.authorId)?.name ?? "renter")}`,
        action: action === "hide" ? "Hid review" : "Kept reported review",
        from,
        to: review.status,
        note: text,
      })
      if (action === "hide") {
        notify(review.authorId, "review", `Your review of ${review.propertyName} was removed`, text, "/overview")
      }
    })
  },

  restore(id: string, note: string): Promise<void> {
    return respond(() => {
      const admin = requireAdmin()
      const review = db.reviews.find((r) => r.id === id) ?? notFound("Review")
      if (review.status !== "hidden") throw new ServiceError("invalid", "Only a hidden review can be restored.")
      // A review from a voided or still-disputed stay has nothing to stand on.
      if (review.kind === "residence") {
        const rental = db.rentals.find((r) => r.id === review.sourceId)
        if (!rental || rental.status === "void" || rental.status === "disputed") {
          throw new ServiceError("invalid", "This review's stay was voided or is disputed, so it can't be restored.")
        }
      }
      const text = requireNote(note, 10, "Add a note explaining the decision (at least 10 characters).")
      review.status = "published"
      recordDecision(admin, {
        area: "review",
        targetId: review.id,
        targetLabel: `${review.propertyName} review`,
        action: "Restored review",
        from: "hidden",
        to: "published",
        note: text,
      })
    })
  },
}
