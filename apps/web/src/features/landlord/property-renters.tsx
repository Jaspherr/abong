import { MessageSquare, Plus } from "lucide-react"
import { Link } from "react-router"
import { MetaBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { RENTAL_PHASE } from "@/constants/reviews"
import { PersonAvatar } from "@/features/profile/person-avatar"
import { ProposeRentalDialog } from "@/features/rentals/propose-rental-dialog"
import { isLivingThere, stayDates } from "@/features/rentals/rental-utils"
import { pluralize } from "@/lib/format"
import type { RentalWithContext } from "@/services"
import type { Property } from "@/types"

function RenterRow({ rental }: { rental: RentalWithContext }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <PersonAvatar userId={rental.renter.id} name={rental.renter.name} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium">{rental.renter.name}</span>
          {rental.phase !== "current" && <MetaBadge meta={RENTAL_PHASE[rental.phase]} />}
        </p>
        <p className="text-meta text-muted-foreground">{rental.phase === "pending" ? "Waiting for your answer" : stayDates(rental)}</p>
      </div>
      {rental.phase === "pending" ? (
        <Button size="sm" variant="outline" asChild>
          <Link to={PATHS.landlord.renters} aria-label={`Answer ${rental.renter.name}'s stay`}>
            Answer
          </Link>
        </Button>
      ) : (
        rental.inquiryId && (
          <Button size="icon-sm" variant="ghost" asChild>
            <Link to={`${PATHS.landlord.inquiries}?thread=${rental.inquiryId}`} aria-label={`Message ${rental.renter.name}`}>
              <MessageSquare aria-hidden="true" />
            </Link>
          </Button>
        )
      )}
    </li>
  )
}

/**
 * Who lives at a property, unit by unit, from stays both sides confirmed. Occupancy is set by hand
 * on each unit, so a unit can show beds taken with nobody recorded; that gap is said out loud.
 */
export function PropertyRenters({ property, rentals }: { property: Property; rentals: RentalWithContext[] }) {
  const here = rentals.filter((r) => r.listingId === property.id && (isLivingThere(r) || (r.phase === "pending" && r.awaitingMe)))
  const unitIds = new Set(property.units.map((u) => u.id))
  const wholePlace = here.filter((r) => !r.unitId || !unitIds.has(r.unitId))
  const groups = property.units
    .map((unit) => ({ unit, renters: here.filter((r) => r.unitId === unit.id) }))
    .filter(({ unit, renters }) => renters.length > 0 || unit.occupiedBeds > 0)
  const living = here.filter(isLivingThere).length

  return (
    <section aria-labelledby="renters-title" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="renters-title" className="type-card-title">
            Who lives here
          </h2>
          <p className="text-meta text-muted-foreground">
            {living ? `${pluralize(living, "renter")} recorded. ` : ""}Stays you and the renter both confirmed.
          </p>
        </div>
        {property.status !== "archived" && (
          <ProposeRentalDialog defaultListingId={property.id}>
            <Button size="sm" variant="outline">
              <Plus aria-hidden="true" />
              Record a renter
            </Button>
          </ProposeRentalDialog>
        )}
      </div>

      {groups.length === 0 && wholePlace.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nobody recorded yet. Record renters here once you've replied to them or confirmed their viewing.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {wholePlace.length > 0 && (
            <div className="py-3 first:pt-0 last:pb-0">
              <h3 className="text-meta font-medium text-muted-foreground">No room or unit given</h3>
              <ul>
                {wholePlace.map((r) => (
                  <RenterRow key={r.id} rental={r} />
                ))}
              </ul>
            </div>
          )}
          {groups.map(({ unit, renters }) => {
            const recorded = renters.filter(isLivingThere).length
            const unrecorded = unit.occupiedBeds - recorded
            return (
              <div key={unit.id} className="py-3 first:pt-0 last:pb-0">
                <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 text-meta">
                  <span className="font-medium">{unit.name}</span>
                  <span className="text-muted-foreground tabular">
                    {unit.occupiedBeds} of {unit.capacity} taken
                  </span>
                </h3>
                {renters.length > 0 && (
                  <ul>
                    {renters.map((r) => (
                      <RenterRow key={r.id} rental={r} />
                    ))}
                  </ul>
                )}
                {unrecorded > 0 && (
                  <p className="pt-1.5 text-meta text-muted-foreground">
                    {recorded ? `${pluralize(unrecorded, "more bed")} marked taken, with no renter recorded.` : `${pluralize(unrecorded, "bed")} marked taken, with no renter recorded.`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
