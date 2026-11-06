import { CalendarDays, Clock, MapPin, StickyNote } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { PATHS } from "@/constants/app"
import { VIEWING_STATUS } from "@/constants/status"
import { formatDate, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { places, type ViewingWithContext } from "@/services"

/** Big calendar-style date block; the most scannable fact in a viewing list. */
export function DateBlock({ date, muted }: { date: string; muted?: boolean }) {
  return (
    <div className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl py-2", muted ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground")}>
      <span className="text-caption font-semibold">{formatDate(date, "MMM")}</span>
      <span className="font-display text-2xl leading-none">{formatDate(date, "d")}</span>
      <span className="text-caption">{formatDate(date, "EEE")}</span>
    </div>
  )
}

export function ViewingCard({
  viewing,
  perspective,
  actions,
}: {
  viewing: ViewingWithContext
  perspective: "renter" | "landlord"
  actions?: ReactNode
}) {
  const past = viewing.status === "completed" || viewing.status === "cancelled" || viewing.status === "declined"
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card sm:flex-row sm:items-start sm:p-5">
      <div className="flex gap-4">
        <DateBlock date={viewing.date} muted={past} />
        <Photo src={viewing.listing.photos[0]?.src} alt="" className="hidden size-20 shrink-0 rounded-xl sm:block" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-sans text-base font-semibold">
            {perspective === "renter" ? (
              <Link to={PATHS.listing(viewing.listing.id)} className="hover:text-primary">
                {viewing.listing.name}
              </Link>
            ) : (
              viewing.renter.name
            )}
          </h3>
          <MetaBadge meta={VIEWING_STATUS[viewing.status]} />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatTime(viewing.time)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            {perspective === "renter" ? <MapPin className="size-3.5" aria-hidden="true" /> : <CalendarDays className="size-3.5" aria-hidden="true" />}
            {perspective === "renter"
              ? `Brgy. ${viewing.listing.address.barangay}, ${places.municipalityName(viewing.listing.address.municipalityId)}`
              : `${viewing.listing.name}${viewing.unitName ? `, ${viewing.unitName}` : ""}`}
          </li>
          {perspective === "renter" && <li>with {viewing.landlordName}</li>}
        </ul>
        {viewing.message && (
          <p className="text-sm">
            <span className="text-muted-foreground">{perspective === "renter" ? "Your note: " : "Renter's note: "}</span>
            {viewing.message}
          </p>
        )}
        {viewing.landlordNote && (
          <p className="flex gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="font-medium">{perspective === "renter" ? `${viewing.landlordName}: ` : "Your note: "}</span>
              {viewing.landlordNote}
            </span>
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">{actions}</div>}
    </article>
  )
}
