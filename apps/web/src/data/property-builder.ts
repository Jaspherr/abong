import type {
  AmenityId,
  Coordinates,
  GenderPolicy,
  HouseRules,
  ListingPhoto,
  ListingStatus,
  Property,
  PropertyType,
  RentalTerms,
  RentalUnit,
  RoomArrangement,
  UnitStatus,
  VerificationStatus,
} from "@/types"
import { daysAgo, daysFromNow } from "./time"

const PHOTO_SUBJECT: Record<string, string> = {
  bed: "Bedroom",
  room: "Room interior",
  living: "Shared living area",
  kitchen: "Kitchen",
  exterior: "Building exterior",
  hall: "Stairway",
}

function photos(propertyName: string, ...keys: string[]): ListingPhoto[] {
  return keys.map((key) => ({
    id: key,
    src: `/photos/${key}.webp`,
    alt: `${PHOTO_SUBJECT[key.split("-")[0]] ?? "Photo"} at ${propertyName}`,
  }))
}

interface UnitOptions {
  cr?: boolean
  aircon?: boolean
  furnished?: boolean
  sqm?: number
  status?: UnitStatus
  /** Days until the unit frees up; defaults to available now. */
  availableIn?: number
}

/** [name, arrangement, per-bed?, rent, capacity, occupiedBeds, options] */
export type UnitSeed = [string, RoomArrangement, boolean, number, number, number, UnitOptions?]

export interface PropertySeed {
  id: string
  landlordId: string
  name: string
  type: PropertyType
  municipalityId: string
  barangay: string
  street?: string
  zipCode: string
  coordinates: Coordinates
  tagline: string
  description: string
  photoKeys: string[]
  amenities: AmenityId[]
  gender: GenderPolicy
  rules?: Partial<HouseRules>
  /** [advance months, deposit months, minimum stay months, utilities included?, utilities note] */
  terms: [number, number, number, boolean, string]
  units: UnitSeed[]
  status?: ListingStatus
  propertyVerification?: VerificationStatus
  updatedDaysAgo: number
  createdDaysAgo?: number
  confirmedDaysAgo?: number
  views: number
}

const DEFAULT_RULES: HouseRules = {
  curfew: null,
  visitors: "daytime-only",
  pets: false,
  smoking: false,
  cooking: true,
  notes: [],
}

export function buildProperty(seed: PropertySeed): Property {
  const [advanceMonths, depositMonths, minimumStayMonths, utilitiesIncluded, utilitiesNote] = seed.terms
  const terms: RentalTerms = { advanceMonths, depositMonths, minimumStayMonths, utilitiesIncluded, utilitiesNote }

  const units: RentalUnit[] = seed.units.map(([name, arrangement, perBed, rent, capacity, occupied, opts = {}], i) => {
    const full = occupied >= capacity
    const status: UnitStatus = opts.status ?? (full && !opts.availableIn ? "occupied" : "available")
    return {
      id: `${seed.id}-u${i + 1}`,
      propertyId: seed.id,
      name,
      arrangement,
      pricing: perBed ? "per-bed" : "per-unit",
      monthlyRent: rent,
      capacity,
      occupiedBeds: occupied,
      floorAreaSqm: opts.sqm,
      privateCr: opts.cr ?? seed.amenities.includes("private-cr"),
      aircon: opts.aircon ?? seed.amenities.includes("aircon"),
      furnished: opts.furnished ?? seed.amenities.includes("furnished"),
      status,
      availableFrom: opts.availableIn ? daysFromNow(opts.availableIn) : daysFromNow(0),
    }
  })

  return {
    id: seed.id,
    landlordId: seed.landlordId,
    name: seed.name,
    type: seed.type,
    tagline: seed.tagline,
    description: seed.description,
    address: {
      street: seed.street,
      barangay: seed.barangay,
      municipalityId: seed.municipalityId,
      province: "Pangasinan",
      zipCode: seed.zipCode,
    },
    coordinates: seed.coordinates,
    photos: photos(seed.name, ...seed.photoKeys),
    amenities: seed.amenities,
    genderPolicy: seed.gender,
    rules: { ...DEFAULT_RULES, ...seed.rules, pets: seed.amenities.includes("pets") },
    terms,
    units,
    status: seed.status ?? "active",
    propertyVerification: seed.propertyVerification ?? "verified",
    createdAt: daysAgo(seed.createdDaysAgo ?? seed.updatedDaysAgo + 120),
    updatedAt: daysAgo(seed.updatedDaysAgo),
    availabilityConfirmedAt: daysAgo(seed.confirmedDaysAgo ?? seed.updatedDaysAgo),
    views: seed.views,
  }
}
