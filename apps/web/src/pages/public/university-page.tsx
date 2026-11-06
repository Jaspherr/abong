import { useQuery } from "@tanstack/react-query"
import { GraduationCap, SearchX } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/feedback/states"
import { ListingGridSkeleton } from "@/components/feedback/skeletons"
import { MapView } from "@/components/maps/map-view"
import type { MapMarker } from "@/components/maps/types"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { searchUrl } from "@/features/discovery/search-params"
import { ListingCard } from "@/features/listings/listing-card"
import { useSearchListings } from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatPeso, formatPesoShort } from "@/lib/format"
import { NEAR_RADIUS_KM } from "@/lib/geo"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { locationsService, places } from "@/services"
import type { Listing } from "@/types"

const RINGS = [
  { id: "walk", label: "Walking distance", hint: "under 1 km", test: (km: number) => km < 1 },
  { id: "short", label: "Short ride", hint: "1–3 km", test: (km: number) => km >= 1 && km < 3 },
  { id: "commute", label: "Commute", hint: "3 km+", test: (km: number) => km >= 3 },
] as const

function UniversityPage() {
  const { slug = "" } = useParams()
  const school = useQuery({ queryKey: qk.university(slug), queryFn: () => locationsService.getUniversity(slug) })
  const results = useSearchListings({ near: slug, sort: "distance" })
  const [ring, setRing] = useState<(typeof RINGS)[number]["id"] | "all">("all")
  useDocumentTitle(school.data ? `Rentals near ${school.data.shortName}` : null)

  const listings = useMemo(() => {
    const all = results.data?.listings ?? []
    const r = RINGS.find((x) => x.id === ring)
    return r ? all.filter((l) => r.test(l.anchorDistance?.distanceKm ?? 99)) : all
  }, [results.data, ring])

  const priceStats = useMemo(() => {
    const prices = (results.data?.listings ?? []).map((l) => l.priceFrom).sort((a, b) => a - b)
    return prices.length ? { low: prices[0], median: prices[Math.floor(prices.length / 2)] } : null
  }, [results.data])

  if (school.data === null) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={SearchX} headingLevel="h1" title="We don't have that school yet" description="Pick another school from the list, or search by town instead." action={<Button asChild><Link to={PATHS.schools}>See all schools</Link></Button>} />
      </div>
    )
  }

  const markers: MapMarker[] = [
    ...listings.map((l: Listing) => ({ id: l.id, kind: "listing" as const, position: l.coordinates, label: formatPesoShort(l.priceFrom), title: l.name, verified: l.isVerified })),
    ...(school.data ? [{ id: "school", kind: "place" as const, position: school.data.coordinates, title: school.data.shortName }] : []),
  ]

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h1 className="type-page-title">
                {school.data ? `Places to rent near ${school.data.shortName}` : "Loading…"}
              </h1>
              {school.data && (
                <p className="text-lg text-muted-foreground">
                  {school.data.name}, {school.data.campus}, {places.municipalityName(school.data.municipalityId)}
                </p>
              )}
            </div>
            {priceStats && (
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Places within {NEAR_RADIUS_KM} km</dt>
                  <dd className="font-display text-2xl">{results.data?.total}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Lowest rent</dt>
                  <dd className="font-display text-2xl">{formatPeso(priceStats.low)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Typical rent</dt>
                  <dd className="font-display text-2xl">{formatPeso(priceStats.median)}</dd>
                </div>
              </dl>
            )}
            <Button variant="outline" asChild>
              <Link to={searchUrl({ near: slug })}>Open in search with filters</Link>
            </Button>
          </div>
          <MapView label="Map of places near campus" markers={markers} className="h-72 rounded-3xl sm:h-96" />
        </div>
      </section>

      <section className="container-page py-10" aria-labelledby="near-results">
        <h2 id="near-results" className="sr-only">
          Listings
        </h2>
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Distance from campus">
          {[{ id: "all" as const, label: "All", hint: "" }, ...RINGS].map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={ring === r.id}
              onClick={() => setRing(r.id)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors",
                ring === r.id ? "border-primary/40 bg-secondary text-secondary-foreground" : "border-border bg-card hover:border-foreground/30",
              )}
            >
              {r.label}
              {r.hint && <span className={ring === r.id ? "text-white/70" : "text-muted-foreground"}>{r.hint}</span>}
            </button>
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Distances are straight-line estimates from the campus, for comparison only.</p>
        {results.isPending ? (
          <ListingGridSkeleton count={3} />
        ) : listings.length === 0 ? (
          <EmptyState compact icon={SearchX} title="Nothing in this range yet" description="Try a wider distance." action={<Button variant="outline" onClick={() => setRing("all")}>Show all distances</Button>} />
        ) : (
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export { UniversityPage as Component }
