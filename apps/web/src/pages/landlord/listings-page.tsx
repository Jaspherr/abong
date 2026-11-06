import { CalendarCheck, ExternalLink, LayoutList, Pencil } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { LineTabs } from "@/components/common/line-tabs"
import { PageHeader } from "@/components/common/page-header"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { EmptyState } from "@/components/feedback/states"
import { TableSkeleton } from "@/components/feedback/skeletons"
import { SearchInput } from "@/components/forms/search-input"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { LISTING_STATUS } from "@/constants/status"
import { LISTING_FILTER_KEYS, LISTING_FILTERS, matchesPropertySearch, type ListingFilter } from "@/features/landlord/listing-filters"
import { useLandlordProperties, usePropertyAction } from "@/features/landlord/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { daysSince, formatNumber, formatRelative, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { propertiesService, type ManagedProperty } from "@/services"

function Figure({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={cn("text-meta font-medium tabular", warn && "text-warning")}>{children}</dd>
    </div>
  )
}

function ListingRow({ property: p }: { property: ManagedProperty }) {
  const confirm = usePropertyAction((lid, pid: string) => propertiesService.confirmAvailability(lid, pid))
  const live = p.status === "active"

  return (
    <li className="grid grid-cols-1 gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-5 lg:grid-cols-[minmax(0,1fr)_19rem_17.5rem] lg:items-center lg:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <Photo src={p.photos[0]?.src} alt="" className="size-14 shrink-0 rounded-lg" />
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{p.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <MetaBadge meta={LISTING_STATUS[p.status]} />
            <span className="text-meta text-muted-foreground">{pluralize(p.units.filter((u) => u.status === "available").length, "unit")} open</span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-[4rem_4.5rem_minmax(0,1fr)] gap-x-4">
        <Figure label="Views">{formatNumber(p.views)}</Figure>
        <Figure label="Inquiries">{p.inquiryCount}</Figure>
        <Figure label="Availability confirmed" warn={live && daysSince(p.availabilityConfirmedAt) > 14}>
          {formatRelative(p.availabilityConfirmedAt)}
        </Figure>
      </dl>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {live && (
          <Button
            variant="outline"
            size="sm"
            disabled={confirm.isPending}
            aria-label={`Confirm availability for ${p.name}`}
            onClick={() => confirm.mutate(p.id, { onSuccess: () => toast.success(`Availability confirmed for ${p.name}`) })}
          >
            <CalendarCheck aria-hidden="true" />
            Confirm
          </Button>
        )}
        {(live || p.status === "pending-review") && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={PATHS.listing(p.id)} aria-label={`View ${p.name} as renters see it`}>
              <ExternalLink aria-hidden="true" />
              View
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link to={PATHS.landlord.property(p.id)} aria-label={`Manage ${p.name}`}>
            <Pencil aria-hidden="true" />
            Manage
          </Link>
        </Button>
      </div>
    </li>
  )
}

function LandlordListingsPage() {
  useDocumentTitle("Listings")
  const { data, isPending } = useLandlordProperties()
  const [filter, setFilter] = useState<ListingFilter>("all")
  const [search, setSearch] = useState("")
  const rows = useMemo(
    () => (data ?? []).filter((p) => LISTING_FILTERS[filter].match(p.status) && matchesPropertySearch(p, search)),
    [data, filter, search],
  )

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Listings" description="How each property appears to renters, and how it's performing." />
      <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-end lg:justify-between lg:gap-8">
        <SearchInput label="Search listings" placeholder="Search by name, barangay or town" value={search} onChange={setSearch} className="w-full lg:mb-2 lg:w-80" />
        <LineTabs
          label="Filter listings by status"
          value={filter}
          onChange={setFilter}
          className="min-w-0 flex-1"
          tabs={LISTING_FILTER_KEYS.map((key) => ({
            value: key,
            label: LISTING_FILTERS[key].label,
            count: data ? data.filter((p) => LISTING_FILTERS[key].match(p.status)).length : undefined,
          }))}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isPending ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={LayoutList} title="No listings here" description="Try another tab or search." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <ListingRow key={p.id} property={p} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { LandlordListingsPage as Component }
