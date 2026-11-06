import { Check } from "lucide-react"
import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  AMENITIES,
  FILTER_AMENITIES,
  GENDER_FILTER_LABELS,
  MIN_STAY_OPTIONS,
  PRICE_BOUNDS,
  PROPERTY_TYPE_ORDER,
  PROPERTY_TYPES,
} from "@/constants/listing"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { GenderPolicy, RoomArrangement, SearchFilters } from "@/types"

function FilterGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-b border-border py-6 first:pt-2 last:border-b-0">
      <legend className="contents">
        <span className="block text-base font-semibold">{title}</span>
      </legend>
      {description && <p className="-mt-1.5 text-meta text-muted-foreground">{description}</p>}
      {children}
    </fieldset>
  )
}

/** Multi-select chip rendered as a real checkbox for keyboard and screen-reader support. */
function ChipCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        checked ? "border-primary bg-secondary text-secondary-foreground" : "border-border bg-card hover:border-foreground/30",
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {checked && <Check className="size-3.5" aria-hidden="true" />}
      {children}
    </label>
  )
}

function ChipRadio<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: T | undefined
  options: Array<{ value: T | undefined; label: string }>
  onChange: (value: T | undefined) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = option.value === value
        return (
          <label
            key={option.label}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm font-medium transition-colors select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
              checked ? "border-primary/40 bg-secondary text-secondary-foreground" : "border-border bg-card hover:border-foreground/30",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

const toggle = <T,>(list: T[] | undefined, item: T, on: boolean) => {
  const next = on ? [...(list ?? []), item] : (list ?? []).filter((x) => x !== item)
  return next.length ? next : undefined
}

export function FiltersPanel({ value, onChange }: { value: SearchFilters; onChange: (patch: Partial<SearchFilters>) => void }) {
  const min = value.priceMin ?? PRICE_BOUNDS.min
  const max = value.priceMax ?? PRICE_BOUNDS.max

  return (
    <div>
      <FilterGroup title="Monthly budget" description="Rent per month. For bedspaces, this is per person.">
        <Slider
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={PRICE_BOUNDS.step}
          value={[min, max]}
          minStepsBetweenThumbs={1}
          onValueChange={([lo, hi]) =>
            onChange({
              priceMin: lo <= PRICE_BOUNDS.min ? undefined : lo,
              priceMax: hi >= PRICE_BOUNDS.max ? undefined : hi,
            })
          }
          aria-label="Monthly budget range"
          className="py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          {(["priceMin", "priceMax"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`filter-${key}`} className="text-xs text-muted-foreground">
                {key === "priceMin" ? "Minimum" : "Maximum"}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                <Input
                  id={`filter-${key}`}
                  inputMode="numeric"
                  className="pl-7 tabular"
                  placeholder={key === "priceMin" ? "No min" : "No max"}
                  value={value[key] ?? ""}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10)
                    onChange({ [key]: Number.isFinite(n) && n > 0 ? n : undefined })
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {(value.priceMin || value.priceMax) && (
          <p className="text-meta text-muted-foreground tabular">
            {formatPeso(min)} to {value.priceMax ? formatPeso(max) : "any amount"}
          </p>
        )}
      </FilterGroup>

      <FilterGroup title="Property type">
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_ORDER.map((type) => (
            <ChipCheckbox
              key={type}
              checked={value.types?.includes(type) ?? false}
              onChange={(on) => onChange({ types: toggle(value.types, type, on) })}
            >
              {PROPERTY_TYPES[type].label}
            </ChipCheckbox>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Room">
        <ChipRadio<RoomArrangement>
          name="arrangement"
          value={value.arrangement}
          onChange={(arrangement) => onChange({ arrangement })}
          options={[
            { value: undefined, label: "Any" },
            { value: "private", label: "Private room" },
            { value: "shared", label: "Shared room" },
          ]}
        />
      </FilterGroup>

      <FilterGroup title="Who can stay" description="Co-ed places are included when you pick male or female.">
        <ChipRadio<GenderPolicy>
          name="gender"
          value={value.gender}
          onChange={(gender) => onChange({ gender })}
          options={[
            { value: undefined, label: "Anyone" },
            ...(["female", "male", "co-ed"] as const).map((g) => ({ value: g, label: GENDER_FILTER_LABELS[g] })),
          ]}
        />
      </FilterGroup>

      <FilterGroup title="Must have">
        <div className="flex flex-wrap gap-2">
          {FILTER_AMENITIES.map((id) => (
            <ChipCheckbox
              key={id}
              checked={value.amenities?.includes(id) ?? false}
              onChange={(on) => onChange({ amenities: toggle(value.amenities, id, on) })}
            >
              {AMENITIES[id].label}
            </ChipCheckbox>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Minimum stay" description="Show places whose required stay fits your plans.">
        <ChipRadio<string>
          name="maxMinStay"
          value={value.maxMinStay ? String(value.maxMinStay) : undefined}
          onChange={(v) => onChange({ maxMinStay: v ? Number(v) : undefined })}
          options={[{ value: undefined, label: "Any length" }, ...MIN_STAY_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))]}
        />
      </FilterGroup>

      <FilterGroup title="Availability and trust">
        <SwitchRow
          id="filter-available"
          label="Available now"
          description="Has at least one room, unit or bedspace open"
          checked={Boolean(value.availableNow)}
          onChange={(on) => onChange({ availableNow: on || undefined })}
        />
        <SwitchRow
          id="filter-verified"
          label="Verified listings only"
          description="Landlord identity and property documents checked"
          checked={Boolean(value.verifiedOnly)}
          onChange={(on) => onChange({ verifiedOnly: on || undefined })}
        />
      </FilterGroup>
    </div>
  )
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="flex flex-col items-start gap-0.5 font-normal">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-meta text-muted-foreground">{description}</span>
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
