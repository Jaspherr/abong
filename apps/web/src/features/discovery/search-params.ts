import { FILTER_AMENITIES, PROPERTY_TYPE_ORDER, SORT_OPTIONS } from "@/constants/listing"
import type { AmenityId, GenderPolicy, PropertyType, RoomArrangement, SearchFilters, SortKey } from "@/types"

/** Search filters live in the URL so results are shareable and survive refresh. */

const list = <T extends string>(value: string | null, allowed: readonly T[]) =>
  value ? (value.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v)) as T[]) : undefined

const int = (value: string | null) => {
  const n = value ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]) =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined

export function parseFilters(params: URLSearchParams): SearchFilters {
  const types = list<PropertyType>(params.get("types"), PROPERTY_TYPE_ORDER)
  const amenities = list<AmenityId>(params.get("amenities"), FILTER_AMENITIES)
  return {
    q: params.get("q") || undefined,
    location: params.get("location") || undefined,
    near: params.get("near") || undefined,
    types: types?.length ? types : undefined,
    priceMin: int(params.get("priceMin")),
    priceMax: int(params.get("priceMax")),
    arrangement: oneOf<RoomArrangement>(params.get("arrangement"), ["private", "shared"]),
    gender: oneOf<GenderPolicy>(params.get("gender"), ["male", "female", "co-ed"]),
    amenities: amenities?.length ? amenities : undefined,
    maxMinStay: int(params.get("maxMinStay")),
    availableNow: params.get("availableNow") === "1" || undefined,
    verifiedOnly: params.get("verifiedOnly") === "1" || undefined,
    sort: oneOf<SortKey>(params.get("sort"), Object.keys(SORT_OPTIONS) as SortKey[]),
  }
}

export function serializeFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  const set = (key: string, value: string | number | undefined | false) => {
    if (value !== undefined && value !== false && value !== "") params.set(key, String(value))
  }
  set("q", filters.q)
  set("location", filters.location)
  set("near", filters.near)
  set("types", filters.types?.join(","))
  set("priceMin", filters.priceMin)
  set("priceMax", filters.priceMax)
  set("arrangement", filters.arrangement)
  set("gender", filters.gender)
  set("amenities", filters.amenities?.join(","))
  set("maxMinStay", filters.maxMinStay)
  set("availableNow", filters.availableNow && "1")
  set("verifiedOnly", filters.verifiedOnly && "1")
  set("sort", filters.sort)
  return params
}

export function searchUrl(filters: SearchFilters) {
  const qs = serializeFilters(filters).toString()
  return qs ? `/search?${qs}` : "/search"
}

/** Number of refinements beyond the place/sort — shown on the "Filters" button. */
export function countRefinements(f: SearchFilters) {
  return (
    (f.types?.length ? 1 : 0) +
    (f.priceMin || f.priceMax ? 1 : 0) +
    (f.arrangement ? 1 : 0) +
    (f.gender ? 1 : 0) +
    (f.amenities?.length ?? 0) +
    (f.maxMinStay ? 1 : 0) +
    (f.availableNow ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0)
  )
}
