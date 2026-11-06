import type { Coordinates } from "@/types"

const EARTH_RADIUS_KM = 6371

/** How far a place can be and still count as "near" a school or landmark. */
export const NEAR_RADIUS_KM = 5

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Rough walking estimate from straight-line distance.
 * Assumes 4.8 km/h and a 1.3× detour factor for real streets.
 * The UI labels this as an estimate — it is not routed travel time.
 */
export function estimateWalkMinutes(distanceKm: number) {
  return Math.max(1, Math.round(((distanceKm * 1.3) / 4.8) * 60))
}
