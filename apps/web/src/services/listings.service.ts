import { NEAR_RADIUS_KM, estimateWalkMinutes, haversineKm } from "@/lib/geo"
import type { DistanceInfo, Listing, Property, RoomArrangement, SearchFilters, SearchResult } from "@/types"
import { responseStats } from "./reputation"
import { db } from "./mock/db"
import { notFound, respond } from "./mock/latency"
import { places } from "./locations.service"
import { isLandlordVisible, isPublic } from "./visibility"

/** Projects a stored property into the public listing shape used by discovery screens. */
export function toListing(property: Property, anchor?: { label: string; coordinates: Property["coordinates"] }): Listing {
  const landlord = db.landlordProfiles.find((l) => l.id === property.landlordId)
  if (!landlord) notFound("Landlord")

  const openUnits = property.units.filter((u) => u.status === "available")
  const rents = property.units.map((u) => u.monthlyRent)
  // The "from" price and its unit (per month vs per person) come from the same unit.
  const cheapest = [...(openUnits.length ? openUnits : property.units)].sort((a, b) => a.monthlyRent - b.monthlyRent)[0]
  const availableBedCount = openUnits.reduce(
    (sum, u) => sum + (u.pricing === "per-bed" ? u.capacity - u.occupiedBeds : 1),
    0,
  )
  const arrangements = [...new Set(property.units.map((u) => u.arrangement))] as RoomArrangement[]

  const nearestUniversity = db.universities
    .map<DistanceInfo>((university) => {
      const distanceKm = haversineKm(property.coordinates, university.coordinates)
      return { university, distanceKm, walkMinutes: estimateWalkMinutes(distanceKm) }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)[0]

  const anchorKm = anchor ? haversineKm(property.coordinates, anchor.coordinates) : undefined

  return {
    ...property,
    priceFrom: cheapest?.monthlyRent ?? 0,
    priceTo: rents.length ? Math.max(...rents) : 0,
    pricingBasis: cheapest?.pricing ?? "per-unit",
    arrangements,
    availableUnitCount: openUnits.length,
    availableBedCount,
    totalUnitCount: property.units.length,
    isVerified:
      property.propertyVerification === "verified" && landlord.verifications.identity === "verified",
    landlord: {
      id: landlord.id,
      userId: landlord.userId,
      displayName: landlord.displayName,
      verifications: landlord.verifications,
      response: responseStats(landlord.id),
      memberSince: landlord.memberSince,
    },
    nearestUniversity: nearestUniversity && nearestUniversity.distanceKm < 6 ? nearestUniversity : undefined,
    anchorDistance:
      anchor && anchorKm !== undefined
        ? { label: anchor.label, distanceKm: anchorKm, walkMinutes: estimateWalkMinutes(anchorKm) }
        : undefined,
  }
}

function matches(listing: Listing, f: SearchFilters): boolean {
  if (f.location && listing.address.municipalityId !== places.municipality(f.location)?.id) return false
  if (f.types?.length && !f.types.includes(listing.type)) return false
  if (f.priceMin && listing.priceTo < f.priceMin) return false
  if (f.priceMax && listing.priceFrom > f.priceMax) return false
  if (f.arrangement && !listing.arrangements.includes(f.arrangement)) return false
  if (f.gender && listing.genderPolicy !== f.gender && listing.genderPolicy !== "co-ed") return false
  if (f.amenities?.some((a) => !hasAmenity(listing, a))) return false
  if (f.maxMinStay && listing.terms.minimumStayMonths > f.maxMinStay) return false
  if (f.availableNow && listing.availableUnitCount === 0) return false
  if (f.verifiedOnly && !listing.isVerified) return false
  if (f.near && listing.anchorDistance && listing.anchorDistance.distanceKm > NEAR_RADIUS_KM) return false
  if (f.q) {
    const q = f.q.toLowerCase()
    const haystack = `${listing.name} ${listing.tagline} ${listing.address.barangay} ${places.municipalityName(listing.address.municipalityId)}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

/** Unit-level facts count too: a property "has" private CR / aircon if any unit does. */
function hasAmenity(listing: Listing, amenity: string) {
  // Utilities are a payment term with one source of truth; a stray amenity tag must not override it.
  if (amenity === "utilities-included") return listing.terms.utilitiesIncluded
  if (listing.amenities.includes(amenity as Listing["amenities"][number])) return true
  if (amenity === "private-cr") return listing.units.some((u) => u.privateCr)
  if (amenity === "aircon") return listing.units.some((u) => u.aircon)
  if (amenity === "furnished") return listing.units.some((u) => u.furnished)
  if (amenity === "pets") return listing.rules.pets
  return false
}

function recommendedScore(l: Listing) {
  const freshnessDays = (Date.now() - Date.parse(l.availabilityConfirmedAt)) / 86_400_000
  return (l.isVerified ? 40 : 0) + (l.availableUnitCount > 0 ? 30 : 0) - freshnessDays + Math.log10(l.views + 1) * 4
}

function sortListings(list: Listing[], sort: SearchFilters["sort"] = "recommended") {
  const sorted = [...list]
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.priceFrom - b.priceFrom)
    case "price-desc":
      return sorted.sort((a, b) => b.priceFrom - a.priceFrom)
    case "newest":
      return sorted.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    case "distance":
      return sorted.sort(
        (a, b) =>
          (a.anchorDistance?.distanceKm ?? a.nearestUniversity?.distanceKm ?? 99) -
          (b.anchorDistance?.distanceKm ?? b.nearestUniversity?.distanceKm ?? 99),
      )
    default:
      return sorted.sort((a, b) => recommendedScore(b) - recommendedScore(a))
  }
}

export const listingsService = {
  search(filters: SearchFilters): Promise<SearchResult> {
    return respond(() => {
      const anchor = filters.near ? places.anchor(filters.near) : undefined
      const listings = sortListings(
        db.properties
          .filter(isPublic)
          .map((p) => toListing(p, anchor))
          .filter((l) => matches(l, filters)),
        filters.sort ?? (anchor ? "distance" : "recommended"),
      )
      return { listings, total: listings.length, anchor }
    }, 420)
  },

  getListing(id: string): Promise<Listing> {
    return respond(() => {
      const property = db.properties.find((p) => p.id === id)
      if (!property || (property.status !== "active" && property.status !== "pending-review") || !isLandlordVisible(property)) notFound("Listing")
      return toListing(property)
    })
  },

  getFeatured(limit = 6): Promise<Listing[]> {
    return respond(() =>
      sortListings(db.properties.filter(isPublic).map((p) => toListing(p)))
        .filter((l) => l.isVerified && l.availableUnitCount > 0)
        .slice(0, limit),
    )
  },

  getMany(ids: string[]): Promise<Listing[]> {
    return respond(() =>
      ids
        .map((id) => db.properties.find((p) => p.id === id))
        .filter((p): p is Property => Boolean(p && isPublic(p)))
        .map((p) => toListing(p)),
    )
  },

  getSimilar(id: string, limit = 4): Promise<Listing[]> {
    return respond(() => {
      const base = db.properties.find((p) => p.id === id)
      if (!base) return []
      return db.properties
        .filter((p) => p.id !== id && isPublic(p))
        .map((p) => toListing(p))
        .sort(
          (a, b) =>
            haversineKm(a.coordinates, base.coordinates) - haversineKm(b.coordinates, base.coordinates),
        )
        .slice(0, limit)
    })
  },

  /** Nearby landmarks and schools for the listing detail page. */
  getNearbyPlaces(id: string) {
    return respond(() => {
      const property = db.properties.find((p) => p.id === id)
      if (!property) return []
      return [
        ...db.universities.map((u) => ({ id: u.id, name: u.shortName, kind: "university" as const, coordinates: u.coordinates })),
        ...db.landmarks.map((l) => ({ id: l.id, name: l.name, kind: l.kind, coordinates: l.coordinates })),
      ]
        .map((place) => {
          const distanceKm = haversineKm(property.coordinates, place.coordinates)
          return { ...place, distanceKm, walkMinutes: estimateWalkMinutes(distanceKm) }
        })
        .filter((place) => place.distanceKm < 4)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5)
    })
  },
}
