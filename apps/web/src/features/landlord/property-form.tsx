import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import { FormField } from "@/components/forms/form-field"
import { ImageUpload, type UploadedImage } from "@/components/forms/image-upload"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AMENITIES, GENDER_POLICIES, PROPERTY_TYPE_ORDER, PROPERTY_TYPES, VISITOR_POLICIES } from "@/constants/listing"
import { useMunicipalities } from "@/features/listings/queries"
import { useFormState } from "@/hooks/use-form-state"
import { pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { places, type PropertyDraft } from "@/services"
import type { AmenityId, GenderPolicy, Property, PropertyType, VisitorPolicy } from "@/types"

interface Values extends Record<string, unknown> {
  name: string
  type: PropertyType | ""
  tagline: string
  description: string
  municipalityId: string
  barangay: string
  street: string
  zipCode: string
  photos: UploadedImage[]
  gender: GenderPolicy
  amenities: AmenityId[]
  hasCurfew: boolean
  curfew: string
  visitors: VisitorPolicy
  cooking: boolean
  smoking: boolean
  advanceMonths: string
  depositMonths: string
  minimumStayMonths: string
  utilitiesIncluded: boolean
  utilitiesNote: string
}

// Utilities are a payment term (see the switch below), not an amenity, so there is one source of truth.
const FORM_SECTIONS: { id: string; short: string; fields: (keyof Values)[] }[] = [
  { id: "basics", short: "Basics", fields: ["name", "type", "tagline", "description"] },
  { id: "location", short: "Location", fields: ["municipalityId", "barangay", "zipCode"] },
  { id: "photos", short: "Photos", fields: ["photos"] },
  { id: "audience", short: "Who it's for", fields: [] },
  { id: "rules", short: "House rules", fields: ["curfew"] },
  { id: "terms", short: "Payment terms", fields: ["advanceMonths", "depositMonths", "minimumStayMonths"] },
]

function FormSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5 border-t border-border py-7 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="type-card-title">{title}</h2>
        <p className="max-w-prose text-meta text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

const FORM_AMENITIES = (Object.keys(AMENITIES) as AmenityId[]).filter((id) => id !== "utilities-included")

const validate = (v: Values) => {
  const e: Partial<Record<keyof Values, string>> = {}
  if (v.name.trim().length < 3) e.name = "Give the property a name renters will recognise."
  if (!v.type) e.type = "Choose the property type."
  if (v.tagline.trim().length < 10) e.tagline = "Write a short line (10+ characters) that sums up the place."
  if (v.description.trim().length < 40) e.description = "Describe the place in at least 40 characters."
  if (!v.municipalityId) e.municipalityId = "Choose the town or city."
  if (!v.barangay.trim()) e.barangay = "Enter the barangay."
  if (!/^\d{4}$/.test(v.zipCode)) e.zipCode = "ZIP codes have 4 digits."
  if (v.photos.length < 1) e.photos = "Add at least one photo. Listings with 5+ photos get more inquiries."
  if (v.hasCurfew && !v.curfew) e.curfew = "Set the curfew time."
  for (const key of ["advanceMonths", "depositMonths", "minimumStayMonths"] as const) {
    if (!/^\d{1,2}$/.test(v[key])) e[key] = "Enter a number of months."
  }
  return e
}

function toValues(p?: Property): Values {
  return {
    name: p?.name ?? "",
    type: p?.type ?? "",
    tagline: p?.tagline ?? "",
    description: p?.description ?? "",
    municipalityId: p?.address.municipalityId ?? "",
    barangay: p?.address.barangay ?? "",
    street: p?.address.street ?? "",
    zipCode: p?.address.zipCode ?? "",
    photos: p?.photos.map((ph) => ({ id: ph.id, src: ph.src, name: ph.alt })) ?? [],
    gender: p?.genderPolicy ?? "co-ed",
    amenities: p?.amenities ?? [],
    hasCurfew: Boolean(p?.rules.curfew),
    curfew: p?.rules.curfew ? to24h(p.rules.curfew) : "22:00",
    visitors: p?.rules.visitors ?? "daytime-only",
    cooking: p?.rules.cooking ?? true,
    smoking: p?.rules.smoking ?? false,
    advanceMonths: String(p?.terms.advanceMonths ?? 1),
    depositMonths: String(p?.terms.depositMonths ?? 1),
    minimumStayMonths: String(p?.terms.minimumStayMonths ?? 5),
    utilitiesIncluded: p?.terms.utilitiesIncluded ?? false,
    utilitiesNote: p?.terms.utilitiesNote ?? "",
  }
}

function to24h(label: string) {
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(label)
  if (!match) return "22:00"
  let h = Number(match[1]) % 12
  if (match[3].toUpperCase() === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${match[2]}`
}

function to12h(time: string) {
  const [h, m] = time.split(":").map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function toDraft(v: Values, existing?: Property): PropertyDraft {
  const town = places.municipality(v.municipalityId)
  return {
    landlordId: existing?.landlordId ?? "",
    name: v.name.trim(),
    type: v.type as PropertyType,
    tagline: v.tagline.trim(),
    description: v.description.trim(),
    address: { street: v.street.trim() || undefined, barangay: v.barangay.trim(), municipalityId: v.municipalityId, province: "Pangasinan", zipCode: v.zipCode },
    // Until a map provider supports pin placement, new properties sit at the town centre.
    coordinates: existing?.address.municipalityId === v.municipalityId ? existing.coordinates : (town?.coordinates ?? { lat: 15.98, lng: 120.36 }),
    photos: v.photos.map((p) => ({ id: p.id, src: p.src, alt: `Photo of ${v.name.trim()}` })),
    amenities: v.amenities.filter((id) => id !== "utilities-included"),
    genderPolicy: v.gender,
    rules: {
      curfew: v.hasCurfew ? to12h(v.curfew) : null,
      visitors: v.visitors,
      pets: v.amenities.includes("pets"),
      smoking: v.smoking,
      cooking: v.cooking,
      notes: existing?.rules.notes ?? [],
    },
    terms: {
      advanceMonths: Number(v.advanceMonths),
      depositMonths: Number(v.depositMonths),
      minimumStayMonths: Number(v.minimumStayMonths),
      utilitiesIncluded: v.utilitiesIncluded,
      utilitiesNote: v.utilitiesNote.trim(),
    },
  }
}

export function PropertyForm({
  property,
  onSubmit,
  submitLabel,
  secondaryLabel,
  cancelTo,
}: {
  property?: Property
  onSubmit: (draft: PropertyDraft, intent: "primary" | "secondary") => Promise<void>
  submitLabel: string
  secondaryLabel?: string
  /** Where "Cancel" leads when adding a property. Editing offers "Discard changes" instead. */
  cancelTo?: string
}) {
  const { data: towns = [] } = useMunicipalities()
  const form = useFormState<Values>(toValues(property), validate)
  const { values, set, blur, errorFor } = form
  const [pending, setPending] = useState<"primary" | "secondary" | null>(null)
  const missing = validate(values)
  const missingCount = Object.keys(missing).length
  const edited = Boolean(property) && JSON.stringify(values) !== JSON.stringify(toValues(property))

  const handle = async (intent: "primary" | "secondary") => {
    if (!form.attempt()) {
      // Wait for the error state to render before moving focus to the first problem.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("form [aria-invalid='true']")?.focus())
      return
    }
    setPending(intent)
    try {
      await onSubmit(toDraft(values, property), intent)
    } finally {
      setPending(null)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        handle("primary")
      }}
      className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8"
    >
      {/* A long form, so an index to jump between sections that also shows what's still missing. */}
      <nav aria-label="Form sections" className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:mx-0 lg:overflow-visible lg:px-0">
        <ul className="flex gap-x-4 text-sm whitespace-nowrap lg:flex-col lg:gap-y-0.5">
          {FORM_SECTIONS.map((s) => {
            const done = s.fields.every((field) => !missing[field])
            const Mark = done ? CheckCircle2 : Circle
            return (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2 rounded-lg py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground lg:px-2 lg:hover:bg-muted">
                  <Mark className={cn("size-4 shrink-0", done ? "text-success" : "text-muted-foreground/60")} aria-hidden="true" />
                  {s.short}
                  {!done && <span className="sr-only"> (not finished)</span>}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="min-w-0 rounded-xl border border-border bg-card px-4 pt-5 sm:px-8 sm:pt-7">
      <FormSection id="basics" title="Basics" description="What renters see first in search results.">
        <FormField label="Property name" required error={errorFor("name")}>
          <Input value={values.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} placeholder="e.g. Santos Boarding House" />
        </FormField>
        <FormField label="Property type" required error={errorFor("type")}>
          <Select value={values.type} onValueChange={(v) => set("type", v as PropertyType)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {PROPERTY_TYPES[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Short headline" required error={errorFor("tagline")} hint="One line, e.g. “Quiet rooms a short walk from UPang”.">
          <Input value={values.tagline} onChange={(e) => set("tagline", e.target.value)} onBlur={() => blur("tagline")} maxLength={80} />
        </FormField>
        <FormField label="Description" required error={errorFor("description")} hint={`${values.description.length}/1500. Mention who it suits, what's nearby and how the house is run.`}>
          <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} onBlur={() => blur("description")} rows={6} maxLength={1500} />
        </FormField>
      </FormSection>

      <FormSection
        id="location"
        title="Location"
        description={`The exact street is only shown to renters after you confirm a viewing.${property?.status === "active" ? " Changing the address sends your live listing back for review." : ""}`}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="City or town" required error={errorFor("municipalityId")}>
            <Select value={values.municipalityId} onValueChange={(v) => set("municipalityId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {towns.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Barangay" required error={errorFor("barangay")}>
            <Input value={values.barangay} onChange={(e) => set("barangay", e.target.value)} onBlur={() => blur("barangay")} />
          </FormField>
          <FormField label="Street and number" optional>
            <Input value={values.street} onChange={(e) => set("street", e.target.value)} />
          </FormField>
          <FormField label="ZIP code" required error={errorFor("zipCode")}>
            <Input inputMode="numeric" maxLength={4} value={values.zipCode} onChange={(e) => set("zipCode", e.target.value.replace(/\D/g, ""))} onBlur={() => blur("zipCode")} placeholder="2400" />
          </FormField>
        </div>
      </FormSection>

      <FormSection id="photos" title="Photos" description="The first photo is the cover. Bright, horizontal photos work best.">
        <div>
          <ImageUpload value={values.photos} onChange={(photos) => set("photos", photos)} invalid={Boolean(errorFor("photos"))} />
          {errorFor("photos") && <p className="mt-2 text-meta text-destructive">{errorFor("photos")}</p>}
        </div>
      </FormSection>

      <FormSection id="audience" title="Who it's for and what's included" description="Renters filter by these, so only tick what every boarder gets. Aircon and private CR can also be set per unit.">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Boarders</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GENDER_POLICIES) as GenderPolicy[]).map((g) => (
              <Label key={g} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3.5 font-normal has-checked:border-primary has-checked:bg-secondary">
                <input type="radio" name="gender" className="accent-primary" checked={values.gender === g} onChange={() => set("gender", g)} />
                {GENDER_POLICIES[g]}
              </Label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Amenities</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {FORM_AMENITIES.map((id) => (
              <Label key={id} className="flex items-center gap-2.5 font-normal">
                <Checkbox
                  checked={values.amenities.includes(id)}
                  onCheckedChange={(on) => set("amenities", on ? [...values.amenities, id] : values.amenities.filter((a) => a !== id))}
                />
                {AMENITIES[id].label}
              </Label>
            ))}
          </div>
        </fieldset>
      </FormSection>

      <FormSection id="rules" title="House rules" description="Clear rules up front mean fewer surprises at the viewing.">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="has-curfew" className="flex flex-col items-start gap-0.5 font-normal">
            <span className="font-medium">Curfew</span>
            <span className="text-meta text-muted-foreground">Gate closing time for boarders</span>
          </Label>
          <Switch id="has-curfew" checked={values.hasCurfew} onCheckedChange={(on) => set("hasCurfew", on)} />
        </div>
        {values.hasCurfew && (
          <FormField label="Curfew time" error={errorFor("curfew")} className="sm:w-48">
            <Input type="time" value={values.curfew} onChange={(e) => set("curfew", e.target.value)} />
          </FormField>
        )}
        <FormField label="Visitors">
          <Select value={values.visitors} onValueChange={(v) => set("visitors", v as VisitorPolicy)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VISITOR_POLICIES) as VisitorPolicy[]).map((v) => (
                <SelectItem key={v} value={v}>
                  {VISITOR_POLICIES[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Label className="flex items-center gap-2.5 font-normal">
            <Checkbox checked={values.cooking} onCheckedChange={(on) => set("cooking", on === true)} />
            Cooking allowed
          </Label>
          <Label className="flex items-center gap-2.5 font-normal">
            <Checkbox checked={values.smoking} onCheckedChange={(on) => set("smoking", on === true)} />
            Smoking area available
          </Label>
        </div>
      </FormSection>

      <FormSection id="terms" title="Payment terms" description="Shown on the listing so renters know what to prepare. Rent per room is set on each unit.">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {(
            [
              ["advanceMonths", "Advance"],
              ["depositMonths", "Deposit"],
              ["minimumStayMonths", "Minimum stay"],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label} required error={errorFor(key)} hint="months">
              <Input inputMode="numeric" maxLength={2} value={values[key]} onChange={(e) => set(key, e.target.value.replace(/\D/g, ""))} onBlur={() => blur(key)} />
            </FormField>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="utilities" className="font-medium">
            Utilities included in rent
          </Label>
          <Switch id="utilities" checked={values.utilitiesIncluded} onCheckedChange={(on) => set("utilitiesIncluded", on)} />
        </div>
        <FormField label="Utilities details" optional hint="e.g. “Water and Wi-Fi included. Electricity sub-metered.”">
          <Input value={values.utilitiesNote} onChange={(e) => set("utilitiesNote", e.target.value)} />
        </FormField>
      </FormSection>

      {/* Actions stay in reach while scrolling a long form. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 rounded-b-xl border-t border-border bg-card px-4 py-3 sm:-mx-8 sm:flex-row sm:items-center sm:px-8">
        <p className="min-w-0 flex-1 text-meta text-muted-foreground">
          {missingCount ? `${pluralize(missingCount, "required detail")} still to fill in` : "All required details are filled in"}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {cancelTo && (
          <Button type="button" variant="ghost" asChild>
            <Link to={cancelTo}>Cancel</Link>
          </Button>
        )}
        {edited && (
          <Button type="button" variant="ghost" disabled={pending !== null} onClick={() => form.reset()}>
            Discard changes
          </Button>
        )}
        {secondaryLabel && (
          <Button type="button" variant="outline" disabled={pending !== null} onClick={() => handle("secondary")}>
            {pending === "secondary" && <Loader2 className="animate-spin" aria-hidden="true" />}
            {secondaryLabel}
          </Button>
        )}
        <Button type="submit" disabled={pending !== null}>
          {pending === "primary" && <Loader2 className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
        </div>
      </div>
      </div>
    </form>
  )
}
