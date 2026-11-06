import { places } from "@/services"
import type { PlaceSuggestion } from "@/types"

/** Converts the URL `location` / `near` pair into the suggestion shown in the picker. */
export function placeFromFilters(location?: string, near?: string): PlaceSuggestion | null {
  if (near) {
    const school = places.university(near)
    if (school) return { kind: "university", id: school.id, slug: school.slug, label: school.shortName, detail: school.name }
    const landmark = places.landmark(near)
    if (landmark) return { kind: "landmark", id: landmark.id, slug: landmark.id, label: landmark.name, detail: "" }
  }
  if (location) {
    const town = places.municipality(location)
    if (town) return { kind: "municipality", id: town.id, slug: town.slug, label: town.name, detail: "" }
  }
  return null
}

export function placeToFilters(place: PlaceSuggestion | null) {
  if (!place) return { location: undefined, near: undefined }
  return place.kind === "municipality" ? { location: place.slug, near: undefined } : { location: undefined, near: place.slug }
}
