import { Search } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PATHS } from "@/constants/app"
import { PROPERTY_TYPE_ORDER, PROPERTY_TYPES } from "@/constants/listing"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PlaceSuggestion, PropertyType } from "@/types"
import { PlaceCombobox } from "./place-combobox"
import { placeToFilters } from "./place-filters"
import { searchUrl } from "./search-params"

const BUDGET_STEPS = [1500, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000]
const ANY = "any"

const QUICK_PICKS = [
  { to: PATHS.near("phinma-upang"), label: "Near PHINMA UPang" },
  { to: PATHS.near("psu-lingayen"), label: "Near PSU Lingayen" },
  { to: "/search?location=urdaneta", label: "Urdaneta City" },
  { to: "/search?types=bedspace&priceMax=2500", label: "Bedspaces under ₱2,500" },
]

/** The home page search panel. */
export function HeroSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [place, setPlace] = useState<PlaceSuggestion | null>(null)
  const [type, setType] = useState<PropertyType | typeof ANY>(ANY)
  const [min, setMin] = useState<string>(ANY)
  const [max, setMax] = useState<string>(ANY)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // A reversed range would hide places that fit, so read it the way it was meant.
    const low = min === ANY ? undefined : Number(min)
    const high = max === ANY ? undefined : Number(max)
    const reversed = low !== undefined && high !== undefined && low > high
    navigate(
      searchUrl({
        ...placeToFilters(place),
        types: type === ANY ? undefined : [type],
        priceMin: reversed ? high : low,
        priceMax: reversed ? low : high,
      }),
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <form
        onSubmit={submit}
        aria-label="Search rentals"
        className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(23_25_28/0.04),0_10px_28px_-14px_rgb(23_25_28/0.16)] sm:p-4"
      >
        <PlaceCombobox value={place} onChange={setPlace} size="lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <Label htmlFor="hero-type" className="text-xs text-muted-foreground">
              Property type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as PropertyType | typeof ANY)}>
              <SelectTrigger id="hero-type" className="w-full data-[size=default]:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any type</SelectItem>
                {PROPERTY_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PROPERTY_TYPES[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <BudgetSelect id="hero-min" label="Budget from" value={min} onChange={setMin} anyLabel="Any" />
          <BudgetSelect id="hero-max" label="Up to" value={max} onChange={setMax} anyLabel="Any" />
          <Button type="submit" size="lg" className="col-span-2 h-11 sm:col-span-1">
            <Search aria-hidden="true" />
            Search
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-meta">
        <span className="text-muted-foreground">Often searched</span>
        {QUICK_PICKS.map((pick) => (
          <Link
            key={pick.to}
            to={pick.to}
            className="font-medium underline decoration-ink/25 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
          >
            {pick.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function BudgetSelect({
  id,
  label,
  value,
  onChange,
  anyLabel,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  anyLabel: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full tabular data-[size=default]:h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {BUDGET_STEPS.map((step) => (
            <SelectItem key={step} value={String(step)} className="tabular">
              {formatPeso(step)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
