import {
  BadgeCheck,
  Circle,
  Clock,
  Cigarette,
  CookingPot,
  GraduationCap,
  Hospital,
  Landmark,
  MessageSquare,
  PawPrint,
  ShoppingBag,
  Store,
  Bus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { PersonAvatar } from "@/features/profile/person-avatar"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { AMENITIES, ARRANGEMENTS, UNIT_STATUSES, VISITOR_POLICIES } from "@/constants/listing"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { InquiryDialog } from "@/features/inquiries/inquiry-dialog"
import { LandlordRatingLine } from "@/features/reviews/listing-reviews"
import { ResponseFacts } from "@/features/reviews/reputation-summary"
import { formatDate, formatDistance, formatMonths, formatPeso, formatPercent, isLaterThanTomorrow } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { reviewsService } from "@/services"
import type { Landmark as LandmarkType, Listing, RentalUnit, VerificationType } from "@/types"
import { amenityPreview, moveInEstimate, priceUnit, unitOpenSlots } from "./listing-utils"

export function DetailSection({ id, title, children, className }: { id?: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn("scroll-mt-24 border-t border-border py-8 first:border-t-0 first:pt-0 xl:grid xl:grid-cols-[10rem_minmax(0,1fr)] xl:gap-8", className)}
    >
      <h2 id={id ? `${id}-title` : undefined} className="mb-5 type-subsection xl:mb-0 xl:text-lg xl:leading-tight">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** The money and commitment facts renters compare first. */
export function KeyFacts({ listing }: { listing: Listing }) {
  const { terms } = listing
  const moveIn = moveInEstimate(listing)
  const bases = new Set(listing.units.map((u) => u.pricing))
  const rentNote = bases.size > 1 ? "per person or per unit, by room" : listing.pricingBasis === "per-bed" ? "per person" : "per unit"
  const facts = [
    { label: "Monthly rent", value: listing.priceTo > listing.priceFrom ? `${formatPeso(listing.priceFrom)} – ${formatPeso(listing.priceTo)}` : formatPeso(listing.priceFrom), note: rentNote },
    { label: "Move-in cost", value: `${listing.priceTo > listing.priceFrom ? "from " : ""}${formatPeso(moveIn.total)}`, note: "estimated, see costs below" },
    { label: "Minimum stay", value: formatMonths(terms.minimumStayMonths), note: terms.minimumStayMonths === 5 ? "one semester" : undefined },
    { label: "Utilities", value: terms.utilitiesIncluded ? "Included" : "Not all included", note: terms.utilitiesIncluded ? "in the monthly rent" : "details in costs below" },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 space-y-1">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="font-display text-xl leading-tight">{fact.value}</dd>
          {fact.note && <dd className="text-xs text-muted-foreground">{fact.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

/** Itemised move-in money so nothing is a surprise at the viewing. */
export function MoveInCosts({ listing }: { listing: Listing }) {
  const { terms } = listing
  const moveIn = moveInEstimate(listing)
  const unit = moveIn.basis === "per-bed" ? "per person, monthly" : "a month"
  const rows = [
    { label: "Advance", detail: `${formatMonths(terms.advanceMonths)} of rent, covers your first month${terms.advanceMonths > 1 ? "s" : ""}`, amount: moveIn.advance },
    { label: "Security deposit", detail: `${formatMonths(terms.depositMonths)} of rent, refundable when you move out`, amount: moveIn.deposit },
  ].filter((row) => row.amount > 0)

  return (
    <div className="space-y-4">
      {/* A ledger: each amount labelled where it belongs, the estimate ruled off and set largest. */}
      <div>
        <dl className="divide-y divide-border border-t border-border">
          <div className="flex items-baseline justify-between gap-4 py-3.5">
            <dt>
              Monthly rent
              <span className="block text-sm text-muted-foreground">
                {moveIn.fromOpenUnit ? `Lowest open rent, ${unit}` : `Starting rent, ${unit}. No rooms are open right now.`}
              </span>
            </dt>
            <dd className="shrink-0 text-lg font-semibold tabular">{formatPeso(moveIn.rent)}</dd>
          </div>
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-3.5">
              <dt>
                {row.label}
                <span className="block text-sm text-muted-foreground">{row.detail}</span>
              </dt>
              <dd className="shrink-0 text-lg font-semibold tabular">{formatPeso(row.amount)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t !border-foreground/70 pt-4 pb-1">
            <dt className="font-semibold">
              Estimated move-in cost
              <span className="block text-sm font-normal text-muted-foreground">Advance plus deposit, due on move-in day</span>
            </dt>
            <dd className="shrink-0 font-display text-3xl leading-none">{formatPeso(moveIn.total)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex gap-3 text-body">
        <Zap className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p>
          {terms.utilitiesIncluded
            ? "Utilities are included in the rent."
            : terms.utilitiesNote
              ? "Not all utilities are included in the rent."
              : "Utilities are paid separately."}
          {terms.utilitiesNote && <span className="block text-sm text-muted-foreground">{terms.utilitiesNote}</span>}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {listing.priceTo > listing.priceFrom && "Rooms with a higher rent cost more to move into. "}
        Confirm the final amount with the landlord, and pay only after your viewing and a written agreement.
      </p>
    </div>
  )
}

function UnitRow({ unit, listing }: { unit: RentalUnit; listing: Listing }) {
  const open = unitOpenSlots(unit)
  const isBed = unit.pricing === "per-bed"
  const tone = unit.status === "available" ? "success" : unit.status === "reserved" ? "warning" : "neutral"
  const soon = isLaterThanTomorrow(unit.availableFrom)

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{unit.name}</h3>
          <StatusBadge tone={soon && unit.status === "available" ? "warning" : tone}>
            {unit.status === "available"
              ? soon
                ? `From ${formatDate(unit.availableFrom, "MMM d")}`
                : isBed
                  ? `${open} of ${unit.capacity} beds open`
                  : "Available"
              : UNIT_STATUSES[unit.status]}
          </StatusBadge>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
          <li>
            {ARRANGEMENTS[unit.arrangement]}, {unit.capacity} {unit.capacity === 1 ? "person" : "people"}
          </li>
          <li>{unit.privateCr ? "Private CR" : "Shared CR"}</li>
          <li>{unit.aircon ? "Aircon" : "Electric fan"}</li>
          {unit.floorAreaSqm && <li>{unit.floorAreaSqm} sqm</li>}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="tabular">
          <span className="font-semibold">{formatPeso(unit.monthlyRent)}</span>
          <span className="text-sm text-muted-foreground"> {priceUnit(unit.pricing)}</span>
        </p>
        <InquiryDialog listing={listing} unitId={unit.id}>
          <Button variant="outline" size="sm" disabled={unit.status === "occupied"}>
            <MessageSquare aria-hidden="true" />
            Ask
            <span className="sr-only"> about {unit.name}</span>
          </Button>
        </InquiryDialog>
      </div>
    </li>
  )
}

export function UnitsList({ listing }: { listing: Listing }) {
  const totalBeds = listing.units.reduce((s, u) => s + u.capacity, 0)
  const occupied = listing.units.reduce((s, u) => s + u.occupiedBeds, 0)
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        {listing.units.length} {listing.units.length === 1 ? "unit" : "rooms and units"}, {occupied} of {totalBeds} beds currently occupied ({formatPercent(occupied / Math.max(1, totalBeds))}).
      </p>
      <ul className="divide-y divide-border">
        {listing.units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} listing={listing} />
        ))}
      </ul>
    </div>
  )
}

export function AmenityGrid({ listing }: { listing: Listing }) {
  // Utilities are a payment term, shown with the costs, so a stray amenity tag can't contradict them.
  const ids = [...new Set([...amenityPreview(listing, 20), ...listing.amenities])].filter((id) => id !== "utilities-included")
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
      {ids.map((id) => {
        const { icon: Icon, label } = AMENITIES[id]
        return (
          <li key={id} className="flex items-center gap-3 text-body">
            <Icon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {label}
          </li>
        )
      })}
    </ul>
  )
}

export function HouseRules({ listing }: { listing: Listing }) {
  const { rules } = listing
  const items: Array<{ icon: LucideIcon; label: string; detail?: string }> = [
    { icon: Clock, label: rules.curfew ? `Curfew at ${rules.curfew}` : "No curfew" },
    { icon: Users, label: VISITOR_POLICIES[rules.visitors] },
    { icon: CookingPot, label: rules.cooking ? "Cooking allowed" : "No cooking in rooms" },
    { icon: PawPrint, label: rules.pets ? "Pets allowed" : "No pets" },
    { icon: Cigarette, label: rules.smoking ? "Smoking area available" : "No smoking" },
  ]
  return (
    <div className="space-y-4">
      <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, detail }) => (
          <li key={label} className="flex gap-3 text-body">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {label}
              {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      {rules.notes.length > 0 && (
        <ul className="list-disc space-y-1 border-t border-border pt-3 pl-5 text-sm text-muted-foreground">
          {rules.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const PLACE_ICONS: Record<LandmarkType["kind"] | "university", LucideIcon> = {
  university: GraduationCap,
  hospital: Hospital,
  mall: ShoppingBag,
  transport: Bus,
  government: Landmark,
  market: Store,
  plaza: Landmark,
}

export function NearbyList({ places }: { places: Array<{ id: string; name: string; kind: keyof typeof PLACE_ICONS; distanceKm: number; walkMinutes: number }> }) {
  if (!places.length) return <p className="text-sm text-muted-foreground">No mapped schools or landmarks within 4 km.</p>
  return (
    <ul className="divide-y divide-border">
      {places.map((p) => {
        const Icon = PLACE_ICONS[p.kind]
        return (
          <li key={p.id} className="flex items-center gap-3 py-2.5 text-body">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">{p.name}</span>
            <span className="text-sm text-muted-foreground tabular">
              {formatDistance(p.distanceKm)}
              {p.distanceKm <= 2.5 && <span className="hidden sm:inline">, ~{p.walkMinutes} min walk</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function LandlordCard({ listing }: { listing: Listing }) {
  const { landlord } = listing
  const reviews = useQuery({ queryKey: qk.landlordReviews(landlord.id), queryFn: () => reviewsService.listForLandlord(landlord.id) })
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex items-center gap-3 sm:w-64 sm:shrink-0">
        <PersonAvatar userId={landlord.userId} name={landlord.displayName} className="size-14 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{landlord.displayName}</p>
          <p className="text-sm text-muted-foreground">On Abong since {formatDate(landlord.memberSince, "MMMM yyyy")}</p>
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <ResponseFacts stats={landlord.response} />
        {reviews.data && <LandlordRatingLine summary={reviews.data.summary} landlordId={landlord.id} />}
        {/* What was checked, one line each; only a completed check gets the mark. */}
        <ul className="space-y-1.5 text-sm" aria-label="Verification">
          {(Object.keys(landlord.verifications) as VerificationType[]).map((type) => {
            const status = landlord.verifications[type]
            const done = status === "verified"
            const Icon = done ? BadgeCheck : Circle
            return (
              <li key={type} className="flex items-center gap-2">
                <Icon className={cn("size-4 shrink-0", done ? "text-primary" : "text-muted-foreground/60")} aria-hidden="true" />
                <span className={done ? undefined : "text-muted-foreground"}>
                  {VERIFICATION_TYPES[type].label} {VERIFICATION_STATUS[status].label.toLowerCase()}
                </span>
              </li>
            )
          })}
        </ul>
        <Button variant="outline" size="sm" asChild>
          <Link to={PATHS.landlordProfile(landlord.id)}>View landlord profile</Link>
        </Button>
      </div>
    </div>
  )
}
