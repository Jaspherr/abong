export interface Coordinates {
  lat: number
  lng: number
}

export type MunicipalityKind = "city" | "municipality"

export interface Municipality {
  id: string
  slug: string
  name: string
  kind: MunicipalityKind
  /** Short, plain description of what renters find there. */
  blurb: string
  coordinates: Coordinates
}

export interface University {
  id: string
  slug: string
  name: string
  shortName: string
  campus: string
  municipalityId: string
  coordinates: Coordinates
}

export type LandmarkKind =
  | "hospital"
  | "mall"
  | "transport"
  | "government"
  | "market"
  | "plaza"

export interface Landmark {
  id: string
  name: string
  kind: LandmarkKind
  municipalityId: string
  coordinates: Coordinates
}

export interface Address {
  street?: string
  barangay: string
  municipalityId: string
  province: "Pangasinan"
  zipCode: string
}

/** A place a renter can search around: a town, a school, or a landmark. */
export type PlaceSuggestion =
  | { kind: "municipality"; id: string; slug: string; label: string; detail: string }
  | { kind: "university"; id: string; slug: string; label: string; detail: string }
  | { kind: "landmark"; id: string; slug: string; label: string; detail: string }
