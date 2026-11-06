import { AMENITIES, PROPERTY_TYPES } from "@/constants/listing"
import { formatDate, formatDistance, isLaterThanTomorrow, pluralize } from "@/lib/format"
import { places } from "@/services"
import type { AmenityId, Listing, PricingBasis, RentalUnit } from "@/types"

export const priceUnit = (basis: PricingBasis) => (basis === "per-bed" ? "/ person" : "/ month")

export const priceUnitLong = (basis: PricingBasis) => (basis === "per-bed" ? "per person, monthly" : "per month")

export function locationLabel(listing: Pick<Listing, "address">) {
  return places.municipalityName(listing.address.municipalityId)
}

export function fullAddress(listing: Pick<Listing, "address">) {
  const { street, barangay } = listing.address
  return [street, `Brgy. ${barangay}`, locationLabel(listing), "Pangasinan"].filter(Boolean).join(", ")
}

export function typeLabel(listing: Pick<Listing, "type">) {
  return PROPERTY_TYPES[listing.type].label
}

/** Amenities worth showing on a card, including unit-level facts like private CR or aircon. */
export function amenityPreview(listing: Listing, limit = 3): AmenityId[] {
  const derived = new Set<AmenityId>(listing.amenities)
  if (listing.units.some((u) => u.aircon)) derived.add("aircon")
  if (listing.units.some((u) => u.privateCr)) derived.add("private-cr")
  if (listing.terms.utilitiesIncluded) derived.add("utilities-included")
  const priority: AmenityId[] = ["wifi", "aircon", "private-cr", "utilities-included", "kitchen", "parking", "laundry", "furnished", "pets"]
  return priority.filter((a) => derived.has(a)).slice(0, limit)
}

export const amenityShort = (id: AmenityId) => AMENITIES[id].short

export function availabilitySummary(listing: Listing): { text: string; tone: "open" | "soon" | "full" } {
  if (listing.availableUnitCount > 0) {
    const isBeds = listing.pricingBasis === "per-bed"
    const count = isBeds ? listing.availableBedCount : listing.availableUnitCount
    const noun = isBeds ? "slot" : listing.type === "house" ? "house" : listing.totalUnitCount === 1 ? "unit" : "room"
    if (listing.totalUnitCount === 1 && !isBeds) {
      const unit = listing.units[0]
      return isLaterThanTomorrow(unit.availableFrom)
        ? { text: `Available ${formatDate(unit.availableFrom, "MMM d")}`, tone: "soon" }
        : { text: "Available now", tone: "open" }
    }
    return { text: `${pluralize(count, noun)} open`, tone: "open" }
  }
  return { text: "Fully occupied", tone: "full" }
}

export function distanceLine(listing: Listing) {
  const anchor = listing.anchorDistance
  if (anchor && anchor.distanceKm < 8) {
    return { text: `${formatDistance(anchor.distanceKm)} from ${anchor.label}`, walk: anchor.distanceKm <= 1.5 ? anchor.walkMinutes : null }
  }
  const nearest = listing.nearestUniversity
  if (nearest) {
    return {
      text: `${formatDistance(nearest.distanceKm)} from ${nearest.university.shortName}`,
      walk: nearest.distanceKm <= 1.5 ? nearest.walkMinutes : null,
    }
  }
  return null
}

export function unitOpenSlots(unit: RentalUnit) {
  if (unit.status !== "available") return 0
  return unit.pricing === "per-bed" ? Math.max(0, unit.capacity - unit.occupiedBeds) : 1
}

/**
 * What a renter pays on move-in day: advance plus deposit, priced from the
 * cheapest open unit (or the lowest rent when nothing is open). An estimate
 * only; the landlord confirms the final amount.
 */
export function moveInEstimate(listing: Pick<Listing, "units" | "terms" | "priceFrom" | "pricingBasis">) {
  const open = listing.units.filter((u) => unitOpenSlots(u) > 0)
  const cheapest = open.length ? open.reduce((a, b) => (b.monthlyRent < a.monthlyRent ? b : a)) : null
  const rent = cheapest ? cheapest.monthlyRent : listing.priceFrom
  const advance = rent * listing.terms.advanceMonths
  const deposit = rent * listing.terms.depositMonths
  return {
    rent,
    advance,
    deposit,
    total: advance + deposit,
    /** How `rent` is charged: the open unit's own basis, or the listing's when nothing is open. */
    basis: cheapest ? cheapest.pricing : listing.pricingBasis,
    /** False when every unit is taken and the estimate falls back to the listing's starting rent. */
    fromOpenUnit: cheapest !== null,
  }
}

/** Places most renters here look for first: rooms, bedspaces, boarding houses and dorms. */
const STUDENT_TYPES = new Set<Listing["type"]>(["boarding-house", "bedspace", "dormitory", "room"])

export function studentTypesFirst<T extends Pick<Listing, "type">>(listings: readonly T[]): T[] {
  return [...listings].sort((a, b) => Number(STUDENT_TYPES.has(b.type)) - Number(STUDENT_TYPES.has(a.type)))
}
