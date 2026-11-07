import { CalendarCheck, ExternalLink, MoreHorizontal, Pencil } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Photo } from "@/components/common/photo"
import { MetaBadge, StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PATHS } from "@/constants/app"
import { PROPERTY_TYPES } from "@/constants/listing"
import { LISTING_STATUS } from "@/constants/status"
import { daysSince, formatPeso, pluralize } from "@/lib/format"
import { places, propertiesService, type ManagedProperty } from "@/services"
import { OccupancyBar } from "./occupancy-bar"
import { usePropertyAction } from "./queries"

function rentRange(rents: number[]) {
  const low = Math.min(...rents)
  const high = Math.max(...rents)
  return high > low ? `${formatPeso(low)}–${formatPeso(high).replace("₱", "")}` : formatPeso(low)
}

export function PropertyCard({ property: p }: { property: ManagedProperty }) {
  const confirm = usePropertyAction((landlordId, id: string) => propertiesService.confirmAvailability(landlordId, id))
  const beds = p.units.reduce((sum, u) => sum + u.capacity, 0)
  const taken = p.units.reduce((sum, u) => sum + u.occupiedBeds, 0)
  const open = p.units.filter((u) => u.status === "available").length
  const rents = p.units.map((u) => u.monthlyRent)
  const live = p.status === "active"
  const stale = live && daysSince(p.availabilityConfirmedAt) > 14

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,border-color] duration-200 focus-within:border-primary hover:border-primary/30 hover:shadow-raised">
      <div className="relative overflow-hidden bg-muted">
        <Photo src={p.photos[0]?.src} alt="" className="aspect-[16/10] w-full" hoverZoom />
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pr-12">
          <MetaBadge meta={LISTING_STATUS[p.status]} />
          {p.isVerified && <StatusBadge tone="brand">Verified</StatusBadge>}
        </div>
      </div>

      <DropdownMenu>
        {/* Above the card's stretched link. */}
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon-sm" className="absolute top-2.5 right-2.5 z-20 bg-card shadow-card hover:bg-muted" aria-label={`Actions for ${p.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link to={PATHS.landlord.property(p.id)}>
              <Pencil aria-hidden="true" />
              Manage units and details
            </Link>
          </DropdownMenuItem>
          {(live || p.status === "pending-review") && (
            <DropdownMenuItem asChild>
              <Link to={PATHS.listing(p.id)}>
                <ExternalLink aria-hidden="true" />
                View public listing
              </Link>
            </DropdownMenuItem>
          )}
          {live && (
            <DropdownMenuItem onSelect={() => confirm.mutate(p.id, { onSuccess: () => toast.success(`Availability confirmed for ${p.name}`) })}>
              <CalendarCheck aria-hidden="true" />
              Confirm availability
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate type-card-title transition-colors group-hover:text-primary">
            <Link to={PATHS.landlord.property(p.id)} className="outline-none after:absolute after:inset-0 after:z-10 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset">
              {p.name}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-meta text-muted-foreground">
            {PROPERTY_TYPES[p.type].label}, Brgy. {p.address.barangay}, {places.municipalityName(p.address.municipalityId)}
          </p>
        </div>

        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-meta text-muted-foreground">{p.units.length ? `${pluralize(p.units.length, "unit")}, ${open} open` : "No units yet"}</p>
            {rents.length > 0 && <p className="shrink-0 text-sm font-semibold tabular">{rentRange(rents)}</p>}
          </div>
          {beds > 0 && <OccupancyBar occupied={taken} capacity={beds} />}
          {stale && <p className="text-meta font-medium text-warning">Availability not confirmed in two weeks</p>}
        </div>
      </div>
    </article>
  )
}
