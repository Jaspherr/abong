import { NEAR_RADIUS_KM, haversineKm } from "@/lib/geo"
import type { Coordinates, Municipality, PlaceSuggestion, University } from "@/types"
import { db } from "./mock/db"
import { respond } from "./mock/latency"
import { isPublic } from "./visibility"

export interface MunicipalityWithCount extends Municipality {
  listingCount: number
  priceFrom: number | null
}

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Synchronous lookups — reference data that would ship with the client or be cached long-term. */
export const places = {
  municipality: (id: string) => db.municipalities.find((m) => m.id === id || m.slug === id),
  university: (idOrSlug: string) => db.universities.find((u) => u.id === idOrSlug || u.slug === idOrSlug),
  landmark: (id: string) => db.landmarks.find((l) => l.id === id),
  municipalityName: (id: string) => db.municipalities.find((m) => m.id === id)?.name ?? id,

  /** Resolve a URL `near` value to a label + point. */
  anchor(slug: string): { label: string; coordinates: Coordinates } | undefined {
    const university = places.university(slug)
    if (university) return { label: university.shortName, coordinates: university.coordinates }
    const landmark = places.landmark(slug)
    if (landmark) return { label: landmark.name, coordinates: landmark.coordinates }
    return undefined
  },

  suggest(query: string, limit = 8): PlaceSuggestion[] {
    const q = normalize(query.trim())
    const towns: PlaceSuggestion[] = db.municipalities.map((m) => ({
      kind: "municipality",
      id: m.id,
      slug: m.slug,
      label: m.name,
      detail: m.kind === "city" ? "City" : "Town",
    }))
    const schools: PlaceSuggestion[] = db.universities.map((u) => ({
      kind: "university",
      id: u.id,
      slug: u.slug,
      label: u.shortName,
      detail: `${u.name}, ${places.municipalityName(u.municipalityId)}`,
    }))
    const marks: PlaceSuggestion[] = db.landmarks.map((l) => ({
      kind: "landmark",
      id: l.id,
      slug: l.id,
      label: l.name,
      detail: places.municipalityName(l.municipalityId),
    }))
    const all = [...towns, ...schools, ...marks]
    if (!q) return [...towns.slice(0, 5), ...schools.slice(0, 3)]
    return all
      .filter((s) => normalize(`${s.label} ${s.detail}`).includes(q))
      .sort((a, b) => Number(!normalize(a.label).startsWith(q)) - Number(!normalize(b.label).startsWith(q)))
      .slice(0, limit)
  },
}

function activeListingsIn(municipalityId: string) {
  return db.properties.filter((p) => isPublic(p) && p.address.municipalityId === municipalityId)
}

export const locationsService = {
  listMunicipalities(): Promise<MunicipalityWithCount[]> {
    return respond(() =>
      db.municipalities
        .map((m) => {
          const list = activeListingsIn(m.id)
          // Same rule as a listing's "from" price: open units first, so a town isn't advertised at a taken room's rent.
          const rents = list.flatMap((p) => {
            const open = p.units.filter((u) => u.status === "available")
            return (open.length ? open : p.units).map((u) => u.monthlyRent)
          })
          return { ...m, listingCount: list.length, priceFrom: rents.length ? Math.min(...rents) : null }
        })
        .sort((a, b) => b.listingCount - a.listingCount),
    )
  },

  listUniversities(): Promise<Array<University & { listingCount: number }>> {
    return respond(() =>
      db.universities.map((u) => ({
        ...u,
        // Matches what the school's page lists: places in range, even across a town line.
        listingCount: db.properties.filter((p) => isPublic(p) && haversineKm(p.coordinates, u.coordinates) <= NEAR_RADIUS_KM).length,
      })),
    )
  },

  getUniversity(slug: string): Promise<University | null> {
    return respond(() => places.university(slug) ?? null)
  },
}
