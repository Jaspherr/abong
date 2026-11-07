
import { useMemo, useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  GraduationCap,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Link } from "react-router"

import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PATHS } from "@/constants/app"
import { useUniversities } from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { pluralize } from "@/lib/format"
import { places } from "@/services"
import { cn } from "@/lib/utils"

type School = NonNullable<
  ReturnType<typeof useUniversities>["data"]
>[number]

type SortMode = "name" | "nearby"

const ALL_TOWNS = "__all__"

// ============================================================
// CAMPUS TILE
// ============================================================

function CampusTile({
  school,
  town,
}: {
  school: School
  town: string
}) {
  return (
    <li className="min-w-0">
      <Link
        to={PATHS.near(school.slug)}
        className={cn(
          "group relative flex h-full min-w-0 overflow-hidden",
          "border border-border bg-card",
          "transition-[border-color,background-color,box-shadow] duration-200",
          "hover:border-primary/35 hover:bg-primary/[0.025]",
          "hover:shadow-[0_12px_28px_-22px_rgba(0,0,0,0.3)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        {/* Animated architectural edge */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.75 origin-top scale-y-0 bg-primary transition-transform duration-300 motion-safe:group-hover:scale-y-100"
        />

        {/* Primary school content */}
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">

          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Campus
            </span>

            <GraduationCap
              className="size-4 text-primary/65"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <h3 className="mt-3 line-clamp-2 font-heading text-[1.15rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground transition-colors duration-200 group-hover:text-primary sm:text-[1.3rem]">
            {school.shortName}
          </h3>

          <div className="mt-2 flex min-w-0 items-start gap-1.5">
            <MapPin
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.6}
              aria-hidden="true"
            />

            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {school.campus}, {town}
            </p>
          </div>

          {/* Campus navigation */}
          <div className="mt-auto flex items-center gap-2 pt-4">
            <span className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
              Explore nearby
            </span>

            <ArrowUpRight
              className="size-3.5 text-primary transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Numeric rental index */}
        <div className="flex w-[5.75rem] shrink-0 flex-col items-center justify-center border-l border-border/70 bg-muted/40 px-2 text-center transition-colors duration-200 group-hover:bg-primary/[0.07] sm:w-25">
          <span className="font-display text-[1.8rem] font-semibold leading-none tracking-[-0.055em] text-foreground tabular-nums sm:text-[2.2rem]">
            {school.listingCount}
          </span>

          <span className="mt-2 text-[10px] font-medium leading-4 text-muted-foreground">
            {school.listingCount === 1
              ? "place"
              : "places"}
            <span className="block">nearby</span>
          </span>
        </div>
      </Link>
    </li>
  )
}

// ============================================================
// SCHOOLS PAGE
// ============================================================

function SchoolsPage() {
  useDocumentTitle("Rentals near schools")

  const {
    data: schools,
    isPending,
    isError,
    refetch,
  } = useUniversities()

  const [search, setSearch] = useState("")
  const [selectedTown, setSelectedTown] = useState(ALL_TOWNS)
  const [sort, setSort] = useState<SortMode>("name")

  const totalCount = schools?.length ?? 0

  // ----------------------------------------------------------
  // TOWN FILTER DATA
  // ----------------------------------------------------------

  const townCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const school of schools ?? []) {
      const town =
        places.municipalityName(school.municipalityId) ||
        "Pangasinan"

      counts.set(town, (counts.get(town) ?? 0) + 1)
    }

    return Array.from(counts, ([name, count]) => ({
      name,
      count,
    })).sort(
      (a, b) =>
        b.count - a.count ||
        a.name.localeCompare(b.name),
    )
  }, [schools])

  const popularTowns = townCounts.slice(0, 4)

  // ----------------------------------------------------------
  // SEARCH, FILTER AND SORT
  // ----------------------------------------------------------

  const filteredSchools = useMemo(() => {
    const query = search.trim().toLowerCase()

    return (schools ?? [])
      .map((school) => ({
        school,
        town:
          places.municipalityName(school.municipalityId) ||
          "Pangasinan",
      }))
      .filter(({ school, town }) => {
        const matchesTown =
          selectedTown === ALL_TOWNS ||
          town === selectedTown

        const matchesSearch =
          !query ||
          [
            school.shortName,
            school.campus,
            town,
          ].some((text) =>
            text.toLowerCase().includes(query),
          )

        return matchesTown && matchesSearch
      })
      .sort((a, b) => {
        if (sort === "nearby") {
          return (
            b.school.listingCount -
              a.school.listingCount ||
            a.school.shortName.localeCompare(
              b.school.shortName,
            )
          )
        }

        return a.school.shortName.localeCompare(
          b.school.shortName,
        )
      })
  }, [schools, search, selectedTown, sort])

  const hasFilters =
    search.trim().length > 0 ||
    selectedTown !== ALL_TOWNS

  const resetFilters = () => {
    setSearch("")
    setSelectedTown(ALL_TOWNS)
  }

  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------

  return (
    <main className="container-page min-w-0 py-7 sm:py-9 lg:py-10">

      {/* =====================================================
          PAGE INTRODUCTION
      ===================================================== */}
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">

        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GraduationCap
                className="size-4"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </span>

            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Abong / Campus Explorer
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-4 font-heading text-[clamp(2rem,3.6vw,3.3rem)] font-semibold leading-[1.13] tracking-[-0.045em] text-foreground">
            Find a place{" "}
            <span className="text-primary">
              near your school.
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Discover rental options near your campus.
            Search by university, location, or town.
          </p>
        </div>

        {/* Directory count */}
        <div className="flex shrink-0 items-end gap-3 border-l-2 border-primary pl-4">
          <span className="font-display text-4xl font-semibold leading-none tracking-[-0.055em] text-foreground tabular-nums">
            {isPending ? "—" : totalCount}
          </span>

          <span className="pb-1 text-xs leading-4 text-muted-foreground">
            Schools
            <span className="block">in the directory</span>
          </span>
        </div>
      </header>

      {/* =====================================================
          SEARCH + FILTER TOOLBAR
      ===================================================== */}
      <div className="grid gap-2.5 border-b border-border py-4 sm:grid-cols-[minmax(0,1fr)_11rem_12rem] sm:gap-3">

        {/* School search */}
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search school, campus, or town"
            aria-label="Search schools"
            className={cn(
              "h-11 w-full rounded-lg border border-border",
              "bg-card pl-10 pr-10 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "outline-none transition-colors duration-200",
              "focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
            )}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Municipality filter */}
        <Select
          value={selectedTown}
          onValueChange={setSelectedTown}
        >
          <SelectTrigger
            aria-label="Filter by town"
            className="h-11 w-full rounded-lg border-border bg-card text-sm"
          >
            <SelectValue placeholder="All towns" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={ALL_TOWNS}>
              All towns
            </SelectItem>

            {townCounts.map((town) => (
              <SelectItem
                key={town.name}
                value={town.name}
              >
                {town.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sort}
          onValueChange={(value) =>
            setSort(value as SortMode)
          }
        >
          <SelectTrigger
            aria-label="Sort schools"
            className="h-11 w-full rounded-lg border-border bg-card text-sm"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="name">
              School name
            </SelectItem>

            <SelectItem value="nearby">
              Most nearby rentals
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* =====================================================
          QUICK TOWN FILTERS
      ===================================================== */}
      {!isPending && !isError && popularTowns.length > 0 && (
        <div className="flex items-center gap-3 border-b border-border/70 py-3">

          <SlidersHorizontal
            className="hidden size-4 shrink-0 text-muted-foreground sm:block"
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <div
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none"
            role="group"
            aria-label="Quick town filters"
          >
            <button
              type="button"
              onClick={() => setSelectedTown(ALL_TOWNS)}
              aria-pressed={selectedTown === ALL_TOWNS}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-semibold",
                "transition-colors duration-200",
                selectedTown === ALL_TOWNS
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground",
              )}
            >
              All campuses
            </button>

            {popularTowns.map((town) => (
              <button
                key={town.name}
                type="button"
                onClick={() => setSelectedTown(town.name)}
                aria-pressed={selectedTown === town.name}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3",
                  "text-xs font-medium transition-colors duration-200",
                  selectedTown === town.name
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {town.name}

                <span className={cn(
                  "text-[10px] tabular-nums",
                  selectedTown === town.name
                    ? "text-background/70"
                    : "text-muted-foreground/70",
                )}>
                  {town.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          RESULTS SUMMARY
      ===================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">

        <div className="flex items-baseline gap-2.5">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.025em] text-foreground sm:text-xl">
            Explore campuses
          </h2>

          {!isPending && !isError && (
            <span
              aria-live="polite"
              className="text-xs text-muted-foreground tabular-nums"
            >
              {filteredSchools.length} results
            </span>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {/* =====================================================
          CAMPUS COLLECTION
      ===================================================== */}
      <div>

        {/* LOADING */}
        {isPending ? (
          <ul
            aria-label="Loading schools"
            className="grid gap-3 sm:grid-cols-2"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="min-w-0">
                <div className="flex h-44 overflow-hidden border border-border bg-card">
                  <div className="flex flex-1 flex-col p-5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-5 h-5 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                    <Skeleton className="mt-auto h-3 w-24" />
                  </div>

                  <Skeleton className="h-full w-22 rounded-none" />
                </div>
              </li>
            ))}
          </ul>

        ) : isError ? (

          /* ERROR */
          <ErrorState onRetry={() => refetch()} />

        ) : totalCount === 0 ? (

          /* EMPTY DIRECTORY */
          <EmptyState
            icon={GraduationCap}
            title="No schools listed yet"
            description="Schools will appear here once campus information is available."
            className="border-y border-border"
          />

        ) : filteredSchools.length === 0 ? (

          /* NO MATCHING SCHOOLS */
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-border bg-muted/20 px-5 py-8 text-center">

            <SearchX
              className="size-8 text-muted-foreground/65"
              strokeWidth={1.4}
              aria-hidden="true"
            />

            <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight text-foreground">
              No matching campuses
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Try another school name or expand your
              location filter.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline hover:underline-offset-4"
            >
              Clear filters

              <ArrowRight
                className="size-4"
                aria-hidden="true"
              />
            </button>
          </div>

        ) : (

          /* CAMPUS GALLERY */
          <ul className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
            {filteredSchools.map(({ school, town }) => (
              <CampusTile
                key={school.id}
                school={school}
                town={town}
              />
            ))}
          </ul>
        )}
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      {!isPending && !isError && totalCount > 0 && (
        <footer className="mt-6 flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">

          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            Distances from campuses are straight-line
            estimates for comparison only.
          </p>

          <span className="text-xs text-muted-foreground">
            Abong / Campus Explorer
          </span>
        </footer>
      )}
    </main>
  )
}

export { SchoolsPage as Component }
