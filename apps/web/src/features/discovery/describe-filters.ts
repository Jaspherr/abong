import { PROPERTY_TYPES } from "@/constants/listing"
import { formatPeso } from "@/lib/format"
import { places } from "@/services"
import type { SearchFilters } from "@/types"

/** Human-readable summary used as the default name for a saved search. */
export function describeFilters(f: SearchFilters) {
  const where = f.near ? `Near ${places.anchor(f.near)?.label ?? f.near}` : f.location ? (places.municipality(f.location)?.name ?? f.location) : "All of Pangasinan"
  const parts = [where]
  if (f.types?.length) parts.push(f.types.map((t) => PROPERTY_TYPES[t].plural.toLowerCase()).join(" or "))
  if (f.priceMax) parts.push(`up to ${formatPeso(f.priceMax)}`)
  return parts.join(", ")
}
