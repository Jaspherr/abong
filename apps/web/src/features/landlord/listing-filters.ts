import { places, type ManagedProperty } from "@/services"
import type { ListingStatus } from "@/types"

export type ListingFilter = "all" | "live" | "attention" | "inactive"

/** The listing groups landlords sort by, shared by the properties and listings pages. */
export const LISTING_FILTERS: Record<ListingFilter, { label: string; match: (status: ListingStatus) => boolean }> = {
  all: { label: "All", match: () => true },
  live: { label: "Live", match: (s) => s === "active" },
  attention: { label: "In review or needs changes", match: (s) => s === "pending-review" || s === "rejected" || s === "suspended" },
  inactive: { label: "Drafts and archived", match: (s) => s === "draft" || s === "archived" },
}

export const LISTING_FILTER_KEYS = Object.keys(LISTING_FILTERS) as ListingFilter[]

/** Matches on the things a landlord remembers a property by: its name, barangay or town. */
export function matchesPropertySearch(property: ManagedProperty, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [property.name, property.address.barangay, places.municipalityName(property.address.municipalityId)].join(" ").toLowerCase().includes(q)
}
