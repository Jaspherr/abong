import type { ListingPhoto, NotificationKind, Rental, RentalPhase, User } from "@/types"
import { formatDate } from "@/lib/format"
import { recordDecision, requireNote } from "./audit"
import { inMutualContact } from "./contact"
import { db, nextId } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"
import { requireAdmin, requireUser } from "./mock/session"
import { addDays, rentalPhase, residenceEligibility, today, type Eligibility } from "./review-eligibility"
import { isPublic } from "./visibility"

/**
 * Rentals: a renter living at a property, confirmed by both sides.
 *
 * - Either side proposes it, but only to someone they're already in two-way contact with
 *   (services/contact.ts), so nobody can attach a stranger or a random property.
 * - Only the other side can confirm it. Nobody confirms their own proposal.
 * - Either side can end a confirmed stay, or dispute it; a dispute holds its reviews until an
 *   admin keeps or voids the rental.
 * - Nothing here touches unit occupancy: landlords still manage that themselves.
 *
 * Only the two people involved and admins can read a rental.
 */

export const DISPUTE_REASON_MIN = 15
/** How far back a stay can start: renters who were already living there before joining. */
const MAX_PAST_DAYS = 730
/** How far ahead a confirmed upcoming stay can start. */
const MAX_FUTURE_DAYS = 180

export interface RentalWithContext extends Rental {
  phase: RentalPhase
  /** Which side the viewer is on. */
  side: "renter" | "landlord"
  /** Proposed by the other side and waiting for the viewer to answer. */
  awaitingMe: boolean
  photo?: ListingPhoto
  /** Whether the listing page is still public, so the UI can link to it. */
  listingPublic: boolean
  renter: Pick<User, "id" | "name">
  landlord: { id: string; userId: string; name: string }
  /** The renter's conversation with this landlord about the property, for a "Message" link. */
  inquiryId?: string
  /** For the renter only: whether and when they can review the stay. */
  review?: Eligibility
}

export interface RentalProposalOptions {
  /** For renters: properties of landlords they're in touch with. */
  properties: { listingId: string; name: string; landlordName: string; units: { id: string; name: string }[] }[]
  /** For landlords: renters they're in touch with. */
  renters: { id: string; name: string }[]
}

function landlordProfileOf(user: User) {
  return user.role === "landlord" ? db.landlordProfiles.find((l) => l.userId === user.id) : undefined
}

/** Which side of a rental the user is on, or refuses if neither. Admins read through the admin calls. */
function sideOf(user: User, rental: Rental): "renter" | "landlord" {
  if (user.role === "renter" && rental.renterId === user.id) return "renter"
  const profile = landlordProfileOf(user)
  if (profile && rental.landlordId === profile.id) return "landlord"
  throw new ServiceError("forbidden", "You can only see your own rentals.")
}

function hydrate(rental: Rental, side: "renter" | "landlord"): RentalWithContext {
  const property = db.properties.find((p) => p.id === rental.listingId)
  const renter = db.users.find((u) => u.id === rental.renterId) ?? notFound("Renter")
  const landlord = db.landlordProfiles.find((l) => l.id === rental.landlordId) ?? notFound("Landlord")
  const inquiry = db.inquiries
    .filter((i) => i.renterId === rental.renterId && i.landlordId === rental.landlordId)
    .sort((a, b) => Number(b.listingId === rental.listingId) - Number(a.listingId === rental.listingId))[0]
  return {
    ...rental,
    phase: rentalPhase(rental),
    side,
    awaitingMe: rental.status === "pending" && rental.proposedBy !== side,
    photo: property?.photos[0],
    listingPublic: property ? isPublic(property) : false,
    renter: { id: renter.id, name: renter.name },
    landlord: { id: landlord.id, userId: landlord.userId, name: landlord.displayName },
    inquiryId: inquiry?.id,
    review: side === "renter" ? residenceEligibility(rental) : undefined,
  }
}

function notify(userId: string, kind: NotificationKind, title: string, body: string, href: string) {
  db.notifications.push({ id: nextId("n"), userId, kind, title, body, href, createdAt: new Date().toISOString(), read: false })
}

const landlordUserId = (rental: Rental) => db.landlordProfiles.find((l) => l.id === rental.landlordId)?.userId ?? ""
const otherUserId = (rental: Rental, side: "renter" | "landlord") => (side === "renter" ? landlordUserId(rental) : rental.renterId)
const hrefFor = (userId: string) =>
  db.users.find((u) => u.id === userId)?.role === "landlord" ? "/landlord/renters" : "/overview"

function find(id: string) {
  return db.rentals.find((r) => r.id === id) ?? notFound("Rental")
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function checkStartDate(startDate: string) {
  const on = today()
  if (!ISO_DATE.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    throw new ServiceError("invalid", "Enter the move-in date.")
  }
  if (startDate < addDays(on, -MAX_PAST_DAYS)) throw new ServiceError("invalid", "Move-in dates can go back up to two years.")
  if (startDate > addDays(on, MAX_FUTURE_DAYS)) throw new ServiceError("invalid", "Move-in dates can be up to six months ahead.")
}

const OPEN: Rental["status"][] = ["pending", "confirmed", "disputed"]

export const rentalsService = {
  /** The signed-in renter's or landlord's rentals, newest first. */
  listMine(): Promise<RentalWithContext[]> {
    return respond(() => {
      const user = requireUser()
      const profile = landlordProfileOf(user)
      const mine =
        user.role === "renter"
          ? db.rentals.filter((r) => r.renterId === user.id)
          : profile
            ? db.rentals.filter((r) => r.landlordId === profile.id)
            : []
      const side = user.role === "renter" ? "renter" : "landlord"
      return mine.sort((a, b) => b.startDate.localeCompare(a.startDate)).map((r) => hydrate(r, side))
    })
  },

  proposalOptions(): Promise<RentalProposalOptions> {
    return respond(() => {
      const user = requireUser()
      if (user.role === "renter") {
        const landlordIds = new Set(db.landlordProfiles.filter((l) => inMutualContact(user.id, l.id)).map((l) => l.id))
        return {
          renters: [],
          properties: db.properties
            .filter((p) => landlordIds.has(p.landlordId) && p.status !== "archived")
            .map((p) => ({
              listingId: p.id,
              name: p.name,
              landlordName: db.landlordProfiles.find((l) => l.id === p.landlordId)?.displayName ?? "Landlord",
              units: p.units.map((u) => ({ id: u.id, name: u.name })),
            })),
        }
      }
      const profile = landlordProfileOf(user)
      if (!profile) throw new ServiceError("forbidden", "Only renters and landlords can record a rental.")
      const renterIds = new Set([...db.inquiries, ...db.viewings].filter((x) => x.landlordId === profile.id).map((x) => x.renterId))
      return {
        renters: [...renterIds]
          .filter((id) => inMutualContact(id, profile.id))
          .map((id) => db.users.find((u) => u.id === id))
          .filter((u): u is User => !!u && u.status === "active")
          .map((u) => ({ id: u.id, name: u.name })),
        properties: db.properties
          .filter((p) => p.landlordId === profile.id && p.status !== "archived")
          .map((p) => ({
            listingId: p.id,
            name: p.name,
            landlordName: profile.displayName,
            units: p.units.map((u) => ({ id: u.id, name: u.name })),
          })),
      }
    })
  },

  /** Records a stay for the other side to confirm. */
  propose(input: { listingId: string; unitId?: string; startDate: string; renterId?: string }): Promise<RentalWithContext> {
    return respond(() => {
      const user = requireUser()
      const property = db.properties.find((p) => p.id === input.listingId) ?? notFound("Property")
      if (property.status === "archived") throw new ServiceError("invalid", "That property is archived.")
      const unit = input.unitId ? property.units.find((u) => u.id === input.unitId) : undefined
      if (input.unitId && !unit) throw new ServiceError("invalid", "That room or unit isn't part of this property.")
      checkStartDate(input.startDate)

      let renterId: string
      let side: "renter" | "landlord"
      if (user.role === "renter") {
        renterId = user.id
        side = "renter"
        if (!inMutualContact(user.id, property.landlordId)) {
          throw new ServiceError("forbidden", "You can add a place once its landlord has replied to you or confirmed a viewing.")
        }
      } else {
        const profile = landlordProfileOf(user)
        if (!profile || property.landlordId !== profile.id) throw new ServiceError("forbidden", "You can only add renters to your own properties.")
        const renter = db.users.find((u) => u.id === input.renterId && u.role === "renter" && u.status === "active")
        if (!renter) throw new ServiceError("invalid", "Choose the renter.")
        if (!inMutualContact(renter.id, profile.id)) {
          throw new ServiceError("forbidden", "You can add a renter once you've replied to them or confirmed their viewing.")
        }
        renterId = renter.id
        side = "landlord"
      }

      const duplicate = db.rentals.some(
        (r) => r.renterId === renterId && r.listingId === property.id && (r.unitId ?? "") === (input.unitId ?? "") && OPEN.includes(r.status),
      )
      if (duplicate) throw new ServiceError("invalid", "This stay is already recorded or waiting for confirmation.")

      const now = new Date().toISOString()
      const rental: Rental = {
        id: nextId("r"),
        renterId,
        landlordId: property.landlordId,
        listingId: property.id,
        unitId: unit?.id,
        startDate: input.startDate,
        proposedBy: side,
        status: "pending",
        propertyName: property.name,
        unitName: unit?.name,
        createdAt: now,
        updatedAt: now,
      }
      db.rentals.push(rental)
      const to = otherUserId(rental, side)
      notify(to, "rental", `Confirm a stay at ${property.name}`, `${user.name} recorded a stay starting ${formatDate(input.startDate, "MMMM d, yyyy")}.`, hrefFor(to))
      return hydrate(rental, side)
    }, 450)
  },

  /** The other side confirms or declines a proposed stay. */
  answer(id: string, accept: boolean): Promise<RentalWithContext> {
    return respond(() => {
      const user = requireUser()
      const rental = find(id)
      const side = sideOf(user, rental)
      if (rental.status !== "pending") throw new ServiceError("invalid", "This stay has already been answered.")
      if (rental.proposedBy === side) throw new ServiceError("forbidden", "The other side needs to confirm a stay you recorded.")
      const now = new Date().toISOString()
      rental.status = accept ? "confirmed" : "declined"
      if (accept) rental.confirmedAt = now
      rental.updatedAt = now
      notify(
        otherUserId(rental, side),
        "rental",
        accept ? `Stay confirmed at ${rental.propertyName}` : `Stay at ${rental.propertyName} declined`,
        accept ? `${user.name} confirmed it.` : `${user.name} said this stay isn't right.`,
        hrefFor(otherUserId(rental, side)),
      )
      return hydrate(rental, side)
    })
  },

  /** Withdraws a proposal the other side hasn't answered yet. */
  cancel(id: string): Promise<RentalWithContext> {
    return respond(() => {
      const user = requireUser()
      const rental = find(id)
      const side = sideOf(user, rental)
      if (rental.status !== "pending" || rental.proposedBy !== side) {
        throw new ServiceError("invalid", "Only a stay you recorded and that's still waiting can be withdrawn.")
      }
      rental.status = "cancelled"
      rental.updatedAt = new Date().toISOString()
      return hydrate(rental, side)
    })
  },

  /** Records that the renter moved out. */
  end(id: string, endDate: string): Promise<RentalWithContext> {
    return respond(() => {
      const user = requireUser()
      const rental = find(id)
      const side = sideOf(user, rental)
      if (rental.status !== "confirmed") throw new ServiceError("invalid", "Only a confirmed stay can be ended.")
      if (!ISO_DATE.test(endDate)) throw new ServiceError("invalid", "Enter the move-out date.")
      if (endDate < rental.startDate) throw new ServiceError("invalid", "The move-out date can't be before the move-in date.")
      if (endDate > today()) throw new ServiceError("invalid", "The move-out date can't be in the future.")
      Object.assign(rental, { status: "ended", endDate, updatedAt: new Date().toISOString() })
      notify(
        otherUserId(rental, side),
        "rental",
        `Stay at ${rental.propertyName} ended`,
        `${user.name} recorded a move-out on ${formatDate(endDate, "MMMM d, yyyy")}. If that's wrong, report a problem with the stay.`,
        hrefFor(otherUserId(rental, side)),
      )
      return hydrate(rental, side)
    })
  },

  /** Either side says a confirmed or ended stay is wrong. An admin decides; reviews from it are held meanwhile. */
  dispute(id: string, reason: string): Promise<RentalWithContext> {
    return respond(() => {
      const user = requireUser()
      const rental = find(id)
      const side = sideOf(user, rental)
      if (rental.status !== "confirmed" && rental.status !== "ended") {
        throw new ServiceError("invalid", "Only a confirmed or ended stay can be disputed.")
      }
      const note = requireNote(reason, DISPUTE_REASON_MIN, `Tell us what's wrong (at least ${DISPUTE_REASON_MIN} characters).`)
      rental.dispute = { openedBy: user.id, reason: note, openedAt: new Date().toISOString(), previousStatus: rental.status }
      rental.status = "disputed"
      rental.updatedAt = rental.dispute.openedAt
      db.reviews.filter((r) => r.kind === "residence" && r.sourceId === rental.id && r.status === "published").forEach((r) => (r.status = "held"))
      notify(
        otherUserId(rental, side),
        "rental",
        `A problem was reported with a stay at ${rental.propertyName}`,
        "Abong will look into it and may contact you.",
        hrefFor(otherUserId(rental, side)),
      )
      return hydrate(rental, side)
    })
  },

  // ---------------------------------------------------------------- admin

  listDisputes(): Promise<(RentalWithContext & { openedByName: string; reviewCount: number })[]> {
    return respond(() => {
      requireAdmin()
      return db.rentals
        .filter((r) => r.status === "disputed")
        .sort((a, b) => (a.dispute?.openedAt ?? "").localeCompare(b.dispute?.openedAt ?? ""))
        .map((r) => ({
          ...hydrate(r, "renter"),
          review: undefined,
          awaitingMe: false,
          openedByName: db.users.find((u) => u.id === r.dispute?.openedBy)?.name ?? "Unknown",
          reviewCount: db.reviews.filter((x) => x.kind === "residence" && x.sourceId === r.id).length,
        }))
    })
  },

  /**
   * Keep: the stay stands; it returns to confirmed or ended and its reviews are published again.
   * Void: the stay wasn't genuine; its reviews stay out of view and stop counting.
   */
  resolveDispute(id: string, outcome: "keep" | "void", note: string): Promise<void> {
    return respond(() => {
      const admin = requireAdmin()
      const rental = find(id)
      if (rental.status !== "disputed" || !rental.dispute) throw new ServiceError("invalid", "This stay isn't disputed.")
      const text = requireNote(note, 10, "Add a note explaining the decision (at least 10 characters).")
      const to = outcome === "keep" ? rental.dispute.previousStatus : "void"
      rental.status = to
      rental.updatedAt = new Date().toISOString()
      db.reviews
        .filter((r) => r.kind === "residence" && r.sourceId === rental.id && r.status === "held")
        .forEach((r) => (r.status = outcome === "keep" ? "published" : "hidden"))
      recordDecision(admin, {
        area: "rental",
        targetId: rental.id,
        targetLabel: `${db.users.find((u) => u.id === rental.renterId)?.name ?? "Renter"} at ${rental.propertyName}`,
        action: outcome === "keep" ? "Kept disputed stay" : "Voided stay",
        from: "disputed",
        to,
        note: text,
      })
      for (const userId of [rental.renterId, landlordUserId(rental)]) {
        notify(
          userId,
          "rental",
          `Decision on the stay at ${rental.propertyName}`,
          outcome === "keep" ? "Abong kept the stay as recorded." : "Abong removed the stay from your records.",
          hrefFor(userId),
        )
      }
      rental.dispute = undefined
    })
  },
}
