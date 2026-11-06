import type { Address, Coordinates, University } from "./location"
import type { LandlordProfile, VerificationStatus } from "./user"

export type PropertyType =
  | "boarding-house"
  | "room"
  | "bedspace"
  | "apartment"
  | "studio"
  | "condominium"
  | "house"
  | "dormitory"

export type GenderPolicy = "male" | "female" | "co-ed"

export type RoomArrangement = "private" | "shared"

export type AmenityId =
  | "wifi"
  | "aircon"
  | "parking"
  | "private-cr"
  | "kitchen"
  | "laundry"
  | "pets"
  | "furnished"
  | "utilities-included"
  | "cctv"
  | "study-area"
  | "water-heater"
  | "refrigerator"
  | "gated"

export type ListingStatus =
  | "draft"
  | "pending-review"
  | "active"
  | "rejected"
  | "suspended"
  | "archived"

export type UnitStatus = "available" | "occupied" | "reserved" | "maintenance"

/** Rent can be charged for the whole unit or per occupant (bedspace). */
export type PricingBasis = "per-unit" | "per-bed"

export interface ListingPhoto {
  id: string
  src: string
  alt: string
}

export interface RentalUnit {
  id: string
  propertyId: string
  name: string
  arrangement: RoomArrangement
  pricing: PricingBasis
  monthlyRent: number
  /** Number of beds/occupants the unit accommodates. */
  capacity: number
  occupiedBeds: number
  floorAreaSqm?: number
  privateCr: boolean
  aircon: boolean
  furnished: boolean
  status: UnitStatus
  availableFrom: string
}

export type VisitorPolicy = "allowed" | "daytime-only" | "not-allowed"

export interface HouseRules {
  /** e.g. "10:00 PM"; null means no curfew. */
  curfew: string | null
  visitors: VisitorPolicy
  pets: boolean
  smoking: boolean
  cooking: boolean
  notes: string[]
}

export interface RentalTerms {
  advanceMonths: number
  depositMonths: number
  minimumStayMonths: number
  utilitiesIncluded: boolean
  utilitiesNote: string
}

export interface Property {
  id: string
  landlordId: string
  name: string
  type: PropertyType
  tagline: string
  description: string
  address: Address
  coordinates: Coordinates
  photos: ListingPhoto[]
  amenities: AmenityId[]
  genderPolicy: GenderPolicy
  rules: HouseRules
  terms: RentalTerms
  units: RentalUnit[]
  status: ListingStatus
  propertyVerification: VerificationStatus
  createdAt: string
  updatedAt: string
  /** The reviewer's latest note to the landlord; cleared on approval and on resubmission. */
  moderationNote?: string
  availabilityConfirmedAt: string
  views: number
}

export interface DistanceInfo {
  university: University
  distanceKm: number
  /** Estimated from straight-line distance — not routed travel time. */
  walkMinutes: number
}

/** Public-facing projection of a property used by discovery screens. */
export interface Listing extends Property {
  priceFrom: number
  priceTo: number
  pricingBasis: PricingBasis
  arrangements: RoomArrangement[]
  availableUnitCount: number
  availableBedCount: number
  totalUnitCount: number
  isVerified: boolean
  landlord: Pick<LandlordProfile, "id" | "displayName" | "verifications" | "responseRate" | "responseTimeHours" | "memberSince">
  nearestUniversity?: DistanceInfo
  /** Present when the search is anchored to a university or landmark. */
  anchorDistance?: { label: string; distanceKm: number; walkMinutes: number }
}

export type SortKey = "recommended" | "price-asc" | "price-desc" | "newest" | "distance"

export interface SearchFilters {
  q?: string
  location?: string
  near?: string
  types?: PropertyType[]
  priceMin?: number
  priceMax?: number
  arrangement?: RoomArrangement
  gender?: GenderPolicy
  amenities?: AmenityId[]
  /** Renter accepts listings whose minimum stay is at most this many months. */
  maxMinStay?: number
  availableNow?: boolean
  verifiedOnly?: boolean
  sort?: SortKey
}

export interface SearchResult {
  listings: Listing[]
  total: number
  anchor?: { label: string; coordinates: Coordinates }
}

export interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
  alerts: boolean
}
