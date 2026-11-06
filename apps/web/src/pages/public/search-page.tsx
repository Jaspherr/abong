
import {
  Check,
  Compass,
  List,
  Map as MapIcon,
  SearchX,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { EmptyState, ErrorState } from "@/components/feedback/states"
import { ListingGridSkeleton } from "@/components/feedback/skeletons"
import { MapView } from "@/components/maps/map-view"
import type { MapMarker } from "@/components/maps/types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { SORT_OPTIONS } from "@/constants/listing"
import { ActiveFilters } from "@/features/discovery/active-filters"
import { FiltersSheet } from "@/features/discovery/filters-sheet"
import { PlaceCombobox } from "@/features/discovery/place-combobox"
import {
  placeFromFilters,
  placeToFilters,
} from "@/features/discovery/place-filters"
import { countRefinements } from "@/features/discovery/search-params"
import { useSearchFilters } from "@/features/discovery/use-search-filters"
import { SaveSearchButton } from "@/features/favorites/saved-searches"
import { ListingCard } from "@/features/listings/listing-card"
import { ListingMiniCard } from "@/features/listings/listing-mini-card"
import { useSearchListings } from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useIsDesktop } from "@/hooks/use-media-query"
import { formatPesoShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { places } from "@/services"

import type { SearchFilters, SortKey } from "@/types"

// ============================================================
// HELPERS
// ============================================================

function resultsHeading(
  filters: SearchFilters,
  anchorLabel?: string,
) {
  if (anchorLabel) return `near ${anchorLabel}`

  if (filters.location) {
    return `in ${
      places.municipality(filters.location)?.name ?? "Pangasinan"
    }`
  }

  return "in Pangasinan"
}

// ============================================================
// QUICK FILTER
// ============================================================

interface QuickToggleProps {
  active: boolean
  onClick: () => void
  children: string
}

function QuickToggle({
  active,
  onClick,
  children,
}: QuickToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2",
        "rounded-full border px-3.5",
        "text-xs font-semibold whitespace-nowrap",
        "transition-[color,background-color,border-color] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full border",
          active
            ? "border-primary-foreground/70 bg-primary-foreground text-primary"
            : "border-muted-foreground/40",
        )}
        aria-hidden="true"
      >
        {active && <Check className="size-2.5" strokeWidth={3} />}
      </span>

      {children}
    </button>
  )
}

// ============================================================
// SEARCH PAGE
// ============================================================

function SearchPage() {
  const { filters, update, replaceAll } = useSearchFilters()

  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useSearchListings(filters)

  const isDesktop = useIsDesktop()

  const [activeId, setActiveId] = useState<string | null>(null)

  const [mobileView, setMobileView] = useState<
    "list" | "map"
  >("list")

  const cardRefs = useRef(new Map<string, HTMLElement>())

  // ----------------------------------------------------------
  // SEARCH CONTEXT
  // ----------------------------------------------------------

  const anchor = useMemo(
    () =>
      filters.near
        ? places.anchor(filters.near)
        : undefined,
    [filters.near],
  )

  const heading = resultsHeading(filters, anchor?.label)

  useDocumentTitle(`Places to rent ${heading}`)

  const listings = data?.listings ?? []
  const total = data?.total ?? 0

  const refinementCount = countRefinements(filters)

  // ----------------------------------------------------------
  // MAP MARKERS
  // ----------------------------------------------------------

  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = (data?.listings ?? []).map(
      (listing) => ({
        id: listing.id,
        kind: "listing",
        position: listing.coordinates,
        label: formatPesoShort(listing.priceFrom),
        title: `${listing.name}, from ${formatPesoShort(
          listing.priceFrom,
        )}`,
        verified: listing.isVerified,
      }),
    )

    if (anchor) {
      result.push({
        id: "anchor",
        kind: "place",
        position: anchor.coordinates,
        title: anchor.label,
      })
    }

    return result
  }, [data, anchor])

  // ----------------------------------------------------------
  // CARD AND MAP SYNC
  // ----------------------------------------------------------

  const focusCard = (id: string) => {
    setActiveId(id)

    if (isDesktop) {
      cardRefs.current.get(id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }

  const activeListing = listings.find(
    (listing) => listing.id === activeId,
  )

  const showMap = isDesktop || mobileView === "map"

  // ----------------------------------------------------------
  // FILTER ACTIONS
  // ----------------------------------------------------------

  const toggleAvailable = () => {
    update({
      availableNow: !filters.availableNow || undefined,
    })
  }

  const toggleVerified = () => {
    update({
      verifiedOnly: !filters.verifiedOnly || undefined,
    })
  }

  const clearFilters = () => {
    replaceAll(
      refinementCount > 0
        ? {
            location: filters.location,
            near: filters.near,
          }
        : {},
    )
  }

  return (
    <div className="min-h-[calc(100svh-var(--header-height))] bg-background">

      {/* =====================================================
          GLOBAL SEARCH COMMAND BAR
      ===================================================== */}
      <div
        className={cn(
          "sticky top-(--header-height) z-30",
          "border-b border-border bg-card/95 backdrop-blur-xl",
        )}
      >
        <div className="flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">

          {/* Desktop context label */}
          <div className="mr-4 hidden shrink-0 items-center gap-2.5 xl:flex">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Compass
                className="size-4.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <div>
              <p className="text-xs font-semibold tracking-tight text-foreground">
                Explore places
              </p>

              <p className="text-caption text-muted-foreground">
                Pangasinan, Philippines
              </p>
            </div>
          </div>

          {/* Location search */}
          <div className="min-w-0 flex-1 md:max-w-[23rem]">
            <PlaceCombobox
              className="w-full"
              value={placeFromFilters(
                filters.location,
                filters.near,
              )}
              onChange={(place) =>
                update({
                  ...placeToFilters(place),
                  sort: undefined,
                })
              }
              placeholder="Search a town or school"
            />
          </div>

          {/* Filter drawer */}
          <div className="shrink-0">
            <FiltersSheet
              filters={filters}
              onApply={replaceAll}
            />
          </div>

          {/* Desktop quick filters */}
          <div className="ml-1 hidden items-center gap-2 lg:flex">
            <span
              aria-hidden="true"
              className="mr-1 h-6 w-px bg-border"
            />

            <QuickToggle
              active={Boolean(filters.availableNow)}
              onClick={toggleAvailable}
            >
              Available now
            </QuickToggle>

            <QuickToggle
              active={Boolean(filters.verifiedOnly)}
              onClick={toggleVerified}
            >
              Verified only
            </QuickToggle>
          </div>

          {/* Toolbar end detail */}
          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground 2xl:flex">
            <span className="size-1.5 rounded-full bg-primary" />

            Explore the map
          </div>
        </div>
      </div>

      {/* =====================================================
          RESULTS + MAP WORKSPACE
      ===================================================== */}
      <div
        className={cn(
          "lg:grid",
          "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
          "xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]",
        )}
      >

        {/* =================================================
            LEFT: SEARCH RESULTS
        ================================================= */}
        <section className="min-w-0">

          <div
            className={cn(
              "px-4 pb-28 pt-7 sm:px-6 sm:pt-9",
              "lg:px-7 lg:pb-12 xl:px-9",
              !isDesktop && mobileView === "map" && "hidden",
            )}
          >

            {/* RESULTS MASTHEAD */}
            <div className="border-b border-border/70 pb-6">

              {/* Small context label */}
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="text-caption font-semibold text-primary">
                  The rental directory
                </span>

                <span
                  className="hidden text-caption font-medium text-muted-foreground sm:block"
                >
                  Find your next place
                </span>
              </div>

              {/* Main result heading */}
              <h1
                className="max-w-2xl font-heading text-[clamp(1.8rem,3vw,2.7rem)] font-semibold leading-[1.15] tracking-[-0.045em] text-foreground"
                aria-live="polite"
              >
                {isPending ? (
                  "Finding places..."
                ) : (
                  <>
                    <span className="font-display tabular-nums text-primary">
                      {total}
                    </span>{" "}
                    {total === 1 ? "place" : "places"} to rent{" "}
                    <span className="text-muted-foreground">
                      {heading}
                    </span>
                  </>
                )}
              </h1>

              {/* Anchor distance explanation */}
              {anchor && (
                <p className="mt-3 max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm">
                  Distances are straight-line estimates from{" "}
                  <span className="font-medium text-foreground">
                    {anchor.label}
                  </span>
                  , for comparison only.
                </p>
              )}

              {/* Updating state */}
              {isFetching && !isPending && (
                <p
                  role="status"
                  className="mt-3 text-xs font-medium text-muted-foreground"
                >
                  Updating results...
                </p>
              )}
            </div>

            {/* =============================================
                RESULTS ACTION BAR
            ============================================= */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 py-5">

              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold text-muted-foreground">
                  Properties
                </span>

                {!isPending && !isError && (
                  <span className="rounded-md bg-muted px-2 py-1 text-caption font-semibold text-foreground tabular-nums">
                    {total}
                  </span>
                )}
              </div>

              {/* Save and sorting controls */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SaveSearchButton filters={filters} />

                <label
                  htmlFor="sort"
                  className="sr-only text-xs font-medium text-muted-foreground sm:not-sr-only"
                >
                  Sort by
                </label>

                <Select
                  value={
                    filters.sort ??
                    (anchor ? "distance" : "recommended")
                  }
                  onValueChange={(value) =>
                    update({
                      sort: value as SortKey,
                    })
                  }
                >
                  <SelectTrigger
                    id="sort"
                    className="h-9 w-37 rounded-lg border-border bg-card text-xs font-medium sm:w-41"
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent align="end">
                    {(
                      Object.keys(SORT_OPTIONS) as SortKey[]
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SORT_OPTIONS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* =============================================
                APPLIED FILTERS
            ============================================= */}
            <div className="border-b border-border/70 pb-5">
              <ActiveFilters
                filters={filters}
                onChange={update}
              />
            </div>

            {/* =============================================
                LISTING RESULTS
            ============================================= */}
            <div className="pt-6">

              {isPending ? (

                /* Initial loading */
                <ListingGridSkeleton
                  count={6}
                  className="sm:grid-cols-2"
                />

              ) : isError ? (

                /* Error */
                <ErrorState
                  title="Search results didn't load"
                  onRetry={() => refetch()}
                />

              ) : total === 0 ? (

                /* Empty results */
                <div className="py-8">
                  <EmptyState
                    icon={SearchX}
                    title="No places match your search"
                    description={
                      refinementCount > 0
                        ? "Try removing a filter or widening your budget to discover more places."
                        : "There are no listings here yet. Try another town in Pangasinan."
                    }
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearFilters}
                        className="rounded-lg"
                      >
                        {refinementCount > 0
                          ? "Clear filters"
                          : "Search all of Pangasinan"}
                      </Button>
                    }
                  />
                </div>

              ) : (

                /* Property results */
                <>
                <h2 className="sr-only">Search results</h2>
                <ul
                  aria-label="Rental search results"
                  className={cn(
                    "grid grid-cols-1 gap-x-4 gap-y-6",
                    "sm:grid-cols-2",
                    "xl:gap-x-5 xl:gap-y-7",
                    "2xl:grid-cols-3",
                    "transition-opacity duration-200",
                    isFetching && "opacity-60",
                  )}
                >
                  {listings.map((listing, index) => (
                    <li
                      key={listing.id}
                      className="min-w-0"
                      ref={(element) => {
                        if (element) {
                          cardRefs.current.set(
                            listing.id,
                            element,
                          )
                        } else {
                          cardRefs.current.delete(
                            listing.id,
                          )
                        }
                      }}
                    >
                      <ListingCard
                        listing={listing}
                        active={activeId === listing.id}
                        priority={index < 2}
                        onHover={
                          isDesktop
                            ? setActiveId
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
                </>
              )}
            </div>

            {/* RESULTS FOOTNOTE */}
            {!isPending && !isError && total > 0 && (
              <div className="mt-10 border-t border-border/70 pt-5">
                <p className="text-xs leading-6 text-muted-foreground">
                  Explore the map to see where these places
                  are located. Select a property for more
                  information.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            RIGHT: INTERACTIVE MAP
        ================================================= */}
        {showMap && (
          <aside
            aria-label="Rental locations map"
            className={cn(
              "min-w-0 overflow-hidden bg-muted",
              isDesktop
                ? [
                    "sticky",
                    "top-[calc(var(--header-height)+4rem)]",
                    "h-[calc(100svh-var(--header-height)-4rem)]",
                    "border-l border-border",
                  ].join(" ")
                : [
                    "fixed inset-x-0 bottom-0",
                    "top-[calc(var(--header-height)+4rem)]",
                    "z-10",
                  ].join(" "),
            )}
          >
            {/* Real map component */}
            <MapView
              label="Map of search results"
              markers={markers}
              activeId={activeId}
              onMarkerClick={focusCard}
              onMarkerHover={
                isDesktop
                  ? setActiveId
                  : undefined
              }
              className="size-full"
            />

            {/* Selected listing preview on mobile */}
            {!isDesktop && activeListing && (
              <div className="absolute inset-x-3 bottom-20 z-[500] sm:inset-x-6">
                <ListingMiniCard
                  listing={activeListing}
                  onClose={() => setActiveId(null)}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* =====================================================
          MOBILE: FLOATING VIEW SWITCHER
      ===================================================== */}
      {!isDesktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">

          <Button
            type="button"
            size="lg"
            onClick={() =>
              setMobileView((current) =>
                current === "list" ? "map" : "list",
              )
            }
            className={cn(
              "pointer-events-auto",
              "h-12 min-w-36 gap-2.5 rounded-full",
              "border border-white/15 bg-ink px-6",
              "font-semibold text-white",
              "shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]",
              "transition-[transform,background-color] duration-200",
              "hover:bg-ink/90",
              "active:scale-[0.97]",
              "focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {mobileView === "list" ? (
              <>
                <MapIcon
                  className="size-4"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Show map
              </>
            ) : (
              <>
                <List
                  className="size-4"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Show results
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export { SearchPage as Component }