import { X } from "lucide-react"
import { AMENITIES, ARRANGEMENTS, GENDER_FILTER_LABELS, MIN_STAY_OPTIONS, PROPERTY_TYPES } from "@/constants/listing"
import { formatPeso } from "@/lib/format"
import type { SearchFilters } from "@/types"

interface Chip {
  key: string
  label: string
  remove: Partial<SearchFilters>
}

function chipsFor(f: SearchFilters): Chip[] {
  const chips: Chip[] = []
  f.types?.forEach((t) =>
    chips.push({ key: `type-${t}`, label: PROPERTY_TYPES[t].label, remove: { types: f.types?.filter((x) => x !== t) } }),
  )
  if (f.priceMin || f.priceMax) {
    const label = f.priceMin && f.priceMax
      ? `${formatPeso(f.priceMin)} – ${formatPeso(f.priceMax)}`
      : f.priceMax
        ? `Up to ${formatPeso(f.priceMax)}`
        : `From ${formatPeso(f.priceMin ?? 0)}`
    chips.push({ key: "price", label, remove: { priceMin: undefined, priceMax: undefined } })
  }
  if (f.arrangement) chips.push({ key: "arr", label: ARRANGEMENTS[f.arrangement], remove: { arrangement: undefined } })
  if (f.gender) chips.push({ key: "gender", label: GENDER_FILTER_LABELS[f.gender], remove: { gender: undefined } })
  f.amenities?.forEach((a) =>
    chips.push({ key: `am-${a}`, label: AMENITIES[a].label, remove: { amenities: f.amenities?.filter((x) => x !== a) } }),
  )
  if (f.maxMinStay) {
    const option = MIN_STAY_OPTIONS.find((o) => o.value === f.maxMinStay)
    chips.push({ key: "stay", label: `Min. stay ${option?.label.toLowerCase() ?? `${f.maxMinStay} months`}`, remove: { maxMinStay: undefined } })
  }
  if (f.availableNow) chips.push({ key: "now", label: "Available now", remove: { availableNow: undefined } })
  if (f.verifiedOnly) chips.push({ key: "verified", label: "Verified only", remove: { verifiedOnly: undefined } })
  return chips
}

export function ActiveFilters({ filters, onChange }: { filters: SearchFilters; onChange: (patch: Partial<SearchFilters>) => void }) {
  const chips = chipsFor(filters)
  if (!chips.length) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => onChange(chip.remove)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary pr-2 pl-2.5 text-meta font-semibold text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]"
            aria-label={`Remove filter: ${chip.label}`}
          >
            {chip.label}
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
