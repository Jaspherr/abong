import {
  Check,
  Compass,
  Expand,
  List,
  Map as MapIcon,
  Minimize2,
  SearchX,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { ListingGridSkeleton } from "@/components/feedback/skeletons";
import { MapView } from "@/components/maps/map-view";
import type { MapMarker } from "@/components/maps/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/constants/listing";
import { ActiveFilters } from "@/features/discovery/active-filters";
import { FiltersSheet } from "@/features/discovery/filters-sheet";
import { PlaceCombobox } from "@/features/discovery/place-combobox";
import {
  placeFromFilters,
  placeToFilters,
} from "@/features/discovery/place-filters";
import { countRefinements } from "@/features/discovery/search-params";
import { useSearchFilters } from "@/features/discovery/use-search-filters";
import { SaveSearchButton } from "@/features/favorites/saved-searches";
import { ListingCard } from "@/features/listings/listing-card";
import { ListingMiniCard } from "@/features/listings/listing-mini-card";
import { useSearchListings } from "@/features/listings/queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useIsDesktop } from "@/hooks/use-media-query";
import { formatPesoShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { places } from "@/services";
import type { SearchFilters, SortKey } from "@/types";

type MobileView = "list" | "map";

function resultsHeading(filters: SearchFilters, anchorLabel?: string) {
  if (anchorLabel) return `near ${anchorLabel}`;
  if (filters.location) {
    return `in ${places.municipality(filters.location)?.name ?? "Pangasinan"}`;
  }
  return "in Pangasinan";
}

function QuickFilter({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5",
        "text-xs font-medium transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-3.5 place-items-center rounded-full border",
          active
            ? "border-background/70 bg-background text-foreground"
            : "border-muted-foreground/50",
        )}
      >
        {active && <Check className="size-2.5" strokeWidth={2.5} />}
      </span>
      {children}
    </button>
  );
}

function SearchPage() {
  const { filters, update, replaceAll } = useSearchFilters();
  const { data, isPending, isError, isFetching, refetch } =
    useSearchListings(filters);
  const isDesktop = useIsDesktop();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [mapExpanded, setMapExpanded] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const anchor = useMemo(
    () => (filters.near ? places.anchor(filters.near) : undefined),
    [filters.near],
  );
  const locationHeading = resultsHeading(filters, anchor?.label);
  useDocumentTitle(`Places to rent ${locationHeading}`);

  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const refinementCount = countRefinements(filters);

  const markers = useMemo<MapMarker[]>(() => {
    const items: MapMarker[] = (data?.listings ?? []).map((listing) => ({
      id: listing.id,
      kind: "listing",
      position: listing.coordinates,
      label: formatPesoShort(listing.priceFrom),
      title: `${listing.name}, from ${formatPesoShort(listing.priceFrom)}`,
      verified: listing.isVerified,
    }));

    if (anchor) {
      items.push({
        id: "anchor",
        kind: "place",
        position: anchor.coordinates,
        title: anchor.label,
      });
    }
    return items;
  }, [data, anchor]);

  const selectedListing = listings.find((listing) => listing.id === activeId);
  const visibleActiveId = selectedListing ? activeId : null;
  const showMap = isDesktop || mobileView === "map";

  const focusCard = (id: string) => {
    setActiveId(id);
    if (isDesktop) {
      cardRefs.current.get(id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const clearFilters = () => {
    replaceAll(
      refinementCount > 0
        ? { location: filters.location, near: filters.near }
        : {},
    );
  };

  return (
    <main className="min-h-[calc(100svh-var(--header-height))] bg-background">
      {/* SEARCH TOOLBAR */}
      <div className="sticky top-(--header-height) z-30 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="flex min-h-16 min-w-0 items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6 lg:px-8">
          <div className="mr-3 hidden shrink-0 items-center gap-2.5 xl:flex">
            <span className="grid size-9 place-items-center rounded-lg border border-border text-primary">
              <Compass
                className="size-4.5"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Explore Abong
              </p>
              <p className="text-[11px] text-muted-foreground">
                Pangasinan rentals
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 md:max-w-[24rem]">
            <PlaceCombobox
              className="w-full"
              value={placeFromFilters(filters.location, filters.near)}
              onChange={(place) =>
                update({ ...placeToFilters(place), sort: undefined })
              }
              placeholder="Search a town or school"
            />
          </div>

          <FiltersSheet filters={filters} onApply={replaceAll} />

          <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 lg:flex">
            <QuickFilter
              active={Boolean(filters.availableNow)}
              onClick={() =>
                update({ availableNow: !filters.availableNow || undefined })
              }
            >
              Available now
            </QuickFilter>
            <QuickFilter
              active={Boolean(filters.verifiedOnly)}
              onClick={() =>
                update({ verifiedOnly: !filters.verifiedOnly || undefined })
              }
            >
              Verified only
            </QuickFilter>
          </div>
        </div>
      </div>

      {/* RESULTS AND MAP */}

      <div
        className={cn(
          "lg:grid lg:transition-[grid-template-columns] lg:duration-300",
          mapExpanded
            ? "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
            : "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]",
        )}
      >
        {/* RESULTS COLUMN */}
        <section
          className={cn(
            "min-w-0 px-4 pb-28 pt-6 sm:px-6 sm:pt-7 lg:px-7 lg:pb-10 xl:px-9",
            !isDesktop && mobileView === "map" && "hidden",
          )}
          aria-labelledby="search-results-title"
        >
          {/* INTRODUCTION */}
          <div className="border-b border-border pb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <span
                  className="size-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                Rental explorer
              </span>
              <span className="text-[11px] text-muted-foreground">
                Pangasinan, Philippines
              </span>
            </div>

            <h1
              id="search-results-title"
              aria-live="polite"
              className="font-heading text-[clamp(1.85rem,3vw,2.7rem)] font-semibold leading-[1.13] tracking-[-0.045em] text-foreground"
            >
              {isPending ? (
                "Finding places…"
              ) : isError ? (
                "Explore places to rent"
              ) : (
                <>
                  <span className="font-display text-primary tabular-nums">
                    {total}
                  </span>{" "}
                  {total === 1 ? "place" : "places"}{" "}
                  <span className="text-muted-foreground">
                    {locationHeading}
                  </span>
                </>
              )}
            </h1>

            {anchor && (
              <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">
                Distances are straight-line estimates from {anchor.label}, for
                comparison only.
              </p>
            )}
          </div>

          {/* RESULTS CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 py-4">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
                Properties
              </h2>
              {!isPending && !isError && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {total}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SaveSearchButton filters={filters} />
              <label htmlFor="search-sort" className="sr-only">
                Sort properties
              </label>
              <Select
                value={filters.sort ?? (anchor ? "distance" : "recommended")}
                onValueChange={(value) => update({ sort: value as SortKey })}
              >
                <SelectTrigger
                  id="search-sort"
                  className="h-9 w-39 rounded-lg border-border bg-card text-xs font-medium"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SORT_OPTIONS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-b border-border/70 pb-3">
            <ActiveFilters filters={filters} onChange={update} />
          </div>

          {/* RESULT LISTINGS */}
          <div className="pt-5">
            {isFetching && !isPending && (
              <p className="mb-3 text-xs text-muted-foreground" role="status">
                Updating results…
              </p>
            )}

            {isPending ? (
              <ListingGridSkeleton count={6} className="sm:grid-cols-2" />
            ) : isError ? (
              <ErrorState
                title="Search results didn't load"
                onRetry={() => refetch()}
              />
            ) : total === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No places match your search"
                description={
                  refinementCount > 0
                    ? "Try removing a filter or widening your budget."
                    : "There are no listings here yet. Try another town in Pangasinan."
                }
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    {refinementCount > 0
                      ? "Clear filters"
                      : "Search all of Pangasinan"}
                  </Button>
                }
              />
            ) : (
              <ul
                aria-label="Rental search results"
                className={cn(
                  "grid grid-cols-1 gap-x-4 gap-y-6",
                  "sm:grid-cols-2",
                  mapExpanded
                    ? "lg:grid-cols-1 xl:grid-cols-2"
                    : "2xl:grid-cols-3",
                  "transition-opacity duration-200",
                  isFetching && "opacity-60",
                )}
              >
                {listings.map((listing, index) => (
                  <li
                    key={listing.id}
                    className="min-w-0 scroll-mt-28"
                    ref={(element) => {
                      if (element) cardRefs.current.set(listing.id, element);
                      else cardRefs.current.delete(listing.id);
                    }}
                  >
                    <ListingCard
                      listing={listing}
                      active={visibleActiveId === listing.id}
                      priority={index < 2}
                      onHover={isDesktop ? setActiveId : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isPending && !isError && total > 0 && (
            <p className="mt-8 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              Choose a property to see more details, or compare its position on
              the map.
            </p>
          )}
        </section>

        {/* MAP COLUMN */}
        {showMap && (
          <aside
            aria-label="Rental locations map"
            className={cn(
              "min-w-0 overflow-hidden bg-muted",
              isDesktop
                ? "sticky top-[calc(var(--header-height)+4rem)] h-[calc(100svh-var(--header-height)-4rem)] self-start border-l border-border"
                : "fixed inset-x-0 bottom-0 top-[calc(var(--header-height)+4rem)] z-10",
            )}
          >
            <MapView
              label="Map of search results"
              markers={markers}
              activeId={visibleActiveId}
              onMarkerClick={focusCard}
              onMarkerHover={isDesktop ? setActiveId : undefined}
              className="size-full"
            />

            {/* Floating map information, without obscuring map interactions */}
            <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[calc(100%-7rem)] rounded-xl border border-border/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-md sm:left-5 sm:top-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Location preview
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {isPending
                  ? "Loading places…"
                  : `${listings.length} ${listings.length === 1 ? "property" : "properties"} on the map`}
              </p>
            </div>

            {isDesktop && (
              <button
                type="button"
                aria-pressed={mapExpanded}
                aria-label={mapExpanded ? "Reduce map size" : "Expand map"}
                title={mapExpanded ? "Reduce map size" : "Expand map"}
                onClick={() => setMapExpanded((expanded) => !expanded)}
                className="absolute right-5 top-5 z-[600] grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {mapExpanded ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Expand className="size-4" aria-hidden="true" />
                )}
              </button>
            )}

            {!isDesktop && selectedListing && (
              <div className="absolute inset-x-3 bottom-20 z-[600] sm:inset-x-6">
                <ListingMiniCard
                  listing={selectedListing}
                  onClose={() => setActiveId(null)}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* MOBILE MAP/LIST SWITCH */}
      {!isDesktop && (
        <Button
          type="button"
          onClick={() =>
            setMobileView((current) => (current === "list" ? "map" : "list"))
          }
          aria-label={
            mobileView === "list" ? "Show rental map" : "Show rental results"
          }
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-30 h-12 -translate-x-1/2 gap-2.5 rounded-full bg-ink px-6 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] hover:bg-ink/90"
        >
          {mobileView === "list" ? (
            <>
              <MapIcon className="size-4" aria-hidden="true" /> Show map
            </>
          ) : (
            <>
              <List className="size-4" aria-hidden="true" /> Show results
            </>
          )}
        </Button>
      )}
    </main>
  );
}

export { SearchPage as Component };
