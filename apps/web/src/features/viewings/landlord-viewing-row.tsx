import { StickyNote } from "lucide-react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { PATHS } from "@/constants/app"
import { VIEWING_STATUS } from "@/constants/status"
import { formatTime } from "@/lib/format"
import type { ViewingWithContext } from "@/services"
import { LandlordViewingActions } from "./landlord-viewing-actions"

/** One viewing in a day's schedule: when, who, which place, then what the landlord can do about it. */
export function LandlordViewingRow({ viewing: v }: { viewing: ViewingWithContext }) {
  return (
    <article className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-4 sm:p-5 lg:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
      <p className="font-display text-price whitespace-nowrap tabular">{formatTime(v.time)}</p>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <UserAvatar name={v.renter.name} className="size-7 text-caption" />
          <h3 className="font-sans text-body font-semibold">{v.renter.name}</h3>
          <MetaBadge meta={VIEWING_STATUS[v.status]} />
        </div>
        <Link to={PATHS.landlord.property(v.listing.id)} className="group/place flex w-fit max-w-full items-center gap-2 text-meta text-muted-foreground hover:text-foreground">
          <Photo src={v.listing.photos[0]?.src} alt="" className="size-7 shrink-0 rounded-md" />
          <span className="truncate underline-offset-4 underline decoration-transparent transition-colors group-hover/place:decoration-current">
            {v.listing.name}
            {v.unitName ? `, ${v.unitName}` : ""}
          </span>
        </Link>
        {v.message && (
          <p className="text-meta">
            <span className="text-muted-foreground">Renter's note: </span>
            {v.message}
          </p>
        )}
        {v.landlordNote && (
          <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-meta">
            <StickyNote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="font-medium">Your note: </span>
              {v.landlordNote}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2 sm:col-start-2 lg:col-start-3 lg:justify-end">
        <LandlordViewingActions viewing={v} />
      </div>
    </article>
  )
}
