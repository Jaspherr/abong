import { Building2, Plus, SearchX } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { LineTabs } from "@/components/common/line-tabs"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { SearchInput } from "@/components/forms/search-input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { LISTING_FILTER_KEYS, LISTING_FILTERS, matchesPropertySearch, type ListingFilter } from "@/features/landlord/listing-filters"
import { PropertyCard } from "@/features/landlord/property-card"
import { useLandlordProperties } from "@/features/landlord/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"

function PropertiesPage() {
  useDocumentTitle("Properties")
  const { data, isPending, isError, refetch } = useLandlordProperties()
  const [filter, setFilter] = useState<ListingFilter>("all")
  const [search, setSearch] = useState("")
  const rows = useMemo(
    () => (data ?? []).filter((p) => LISTING_FILTERS[filter].match(p.status) && matchesPropertySearch(p, search)),
    [data, filter, search],
  )

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Properties and units"
        description="Each property holds the rooms, bedspaces or units you rent out."
        actions={
          <Button asChild>
            <Link to={PATHS.landlord.newProperty}>
              <Plus aria-hidden="true" />
              Add property
            </Link>
          </Button>
        }
      />
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            icon={Building2}
            title="Add your first property"
            description="Start with the building or house, then add each room or unit you rent out."
            action={
              <Button asChild>
                <Link to={PATHS.landlord.newProperty}>Add property</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-end lg:justify-between lg:gap-8">
            <SearchInput label="Search properties" placeholder="Search by name, barangay or town" value={search} onChange={setSearch} className="w-full lg:mb-2 lg:w-80" />
            <LineTabs
              label="Filter properties by status"
              value={filter}
              onChange={setFilter}
              className="min-w-0 flex-1"
              tabs={LISTING_FILTER_KEYS.map((key) => ({
                value: key,
                label: LISTING_FILTERS[key].label,
                count: data.filter((p) => LISTING_FILTERS[key].match(p.status)).length,
              }))}
            />
          </div>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border">
              <EmptyState compact icon={SearchX} title="No properties match" description="Try another name or status." />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((p) => (
                <li key={p.id} className="min-w-0">
                  <PropertyCard property={p} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export { PropertiesPage as Component }
