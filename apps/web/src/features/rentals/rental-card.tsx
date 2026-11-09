import type { ReactNode } from "react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { PATHS } from "@/constants/app"
import { RENTAL_PHASE } from "@/constants/reviews"
import { PersonAvatar } from "@/features/profile/person-avatar"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RentalWithContext } from "@/services"

/** The dates of a stay in words: "Since March 3, 2026", "Moving in May 1, 2026", "March 2025 to June 2026". */
function stayDates(rental: RentalWithContext) {
  const start = formatDate(rental.startDate, "MMMM d, yyyy")
  switch (rental.phase) {
    case "upcoming":
      return `Moving in ${start}`
    case "current":
      return `Since ${start}`
    case "past":
      return `${formatDate(rental.startDate, "MMMM yyyy")} to ${formatDate(rental.endDate ?? rental.startDate, "MMMM yyyy")}`
    default:
      return rental.endDate
        ? `${formatDate(rental.startDate, "MMMM yyyy")} to ${formatDate(rental.endDate, "MMMM yyyy")}`
        : `From ${start}`
  }
}

function statusLine(rental: RentalWithContext) {
  const other = rental.side === "renter" ? rental.landlord.name : rental.renter.name
  if (rental.phase === "pending") {
    return rental.awaitingMe ? `${other} recorded this stay. Confirm it if it's right.` : `Waiting for ${other} to confirm.`
  }
  if (rental.phase === "disputed") return "A problem was reported with this stay. Abong is looking into it."
  if (rental.status === "declined") return rental.proposedBy === rental.side ? `${other} said this stay isn't right.` : "You declined this stay."
  if (rental.status === "cancelled") return "Withdrawn before it was confirmed."
  if (rental.status === "void") return "Abong removed this stay after a review."
  return undefined
}

/**
 * One stay, from the viewer's side: the property and the other person, its status in words,
 * and whatever the viewer can do next.
 */
export function RentalCard({ rental, actions, emphasis }: { rental: RentalWithContext; actions?: ReactNode; emphasis?: boolean }) {
  const person = rental.side === "renter" ? { id: rental.landlord.userId, name: rental.landlord.name, role: "Landlord" } : { id: rental.renter.id, name: rental.renter.name, role: "Renter" }
  const line = statusLine(rental)
  return (
    <article
      className={cn(
        "grid min-w-0 grid-cols-1 gap-4 rounded-2xl bg-card p-4 shadow-card sm:grid-cols-[7rem_minmax(0,1fr)] sm:p-5",
        emphasis && "sm:grid-cols-[10rem_minmax(0,1fr)]",
      )}
      aria-label={`${rental.propertyName}, ${RENTAL_PHASE[rental.phase].label}`}
    >
      <Photo src={rental.photo?.src} alt="" className={cn("aspect-[4/3] w-full rounded-xl sm:aspect-square", emphasis && "sm:aspect-[4/5]")} />
      <div className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <MetaBadge meta={RENTAL_PHASE[rental.phase]} />
          </div>
          <h3 className={cn("min-w-0 break-words", emphasis ? "type-subsection" : "type-card-title")}>
            {rental.listingPublic ? (
              <Link to={PATHS.listing(rental.listingId)} className="hover:text-primary">
                {rental.propertyName}
              </Link>
            ) : (
              rental.propertyName
            )}
          </h3>
          <p className="text-meta text-muted-foreground">
            {rental.unitName ? `${rental.unitName}. ` : ""}
            {stayDates(rental)}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar userId={person.id} name={person.name} className="size-8" />
          <div className="min-w-0 text-meta">
            <p className="truncate font-medium">{person.name}</p>
            <p className="text-caption text-muted-foreground">{person.role}</p>
          </div>
        </div>
        {line && <p className="text-meta text-muted-foreground">{line}</p>}
        {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
      </div>
    </article>
  )
}
