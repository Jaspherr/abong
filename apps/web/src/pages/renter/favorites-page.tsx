import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Columns3,
  Heart,
  LayoutGrid,
  MessageSquare,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { ErrorState } from "@/components/feedback/states";
import { ListingGridSkeleton } from "@/components/feedback/skeletons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PATHS } from "@/constants/app";
import { CompareTable } from "@/features/favorites/compare-table";
import { SavedSearchList } from "@/features/favorites/saved-searches";
import {
  useFavorites,
  useRemoveFavorites,
} from "@/features/favorites/use-favorites";
import { InquiryDialog } from "@/features/inquiries/inquiry-dialog";
import { ListingCard } from "@/features/listings/listing-card";
import { useListings } from "@/features/listings/queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatRelative, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

type Sort = "saved" | "price-asc" | "price-desc";
type View = "grid" | "compare";

function FavoritesPage() {
  useDocumentTitle("Saved places");

  const favorites = useFavorites();

  const ids = useMemo(
    () => (favorites.data ?? []).map((favorite) => favorite.listingId),
    [favorites.data],
  );

  const listings = useListings(ids);
  const removeMany = useRemoveFavorites();

  const [sort, setSort] = useState<Sort>("saved");
  const [view, setView] = useState<View>("grid");

  // ----------------------------------------------------------
  // SAVED LISTING DATA
  // ----------------------------------------------------------

  const savedAt = useMemo(
    () =>
      new Map(
        (favorites.data ?? []).map((favorite) => [
          favorite.listingId,
          favorite.savedAt,
        ]),
      ),
    [favorites.data],
  );

  const sorted = useMemo(() => {
    const list = (listings.data ?? []).filter((listing) =>
      savedAt.has(listing.id),
    );

    if (sort === "price-asc") {
      return [...list].sort((a, b) => a.priceFrom - b.priceFrom);
    }

    if (sort === "price-desc") {
      return [...list].sort((a, b) => b.priceFrom - a.priceFrom);
    }

    return [...list].sort(
      (a, b) =>
        Date.parse(savedAt.get(b.id) ?? "") -
        Date.parse(savedAt.get(a.id) ?? ""),
    );
  }, [listings.data, sort, savedAt]);

  const loading = favorites.isPending || (ids.length > 0 && listings.isPending);

  const settled = !loading && listings.isSuccess && !listings.isPlaceholderData;

  const unavailable = settled
    ? ids.filter(
        (id) => !(listings.data ?? []).some((listing) => listing.id === id),
      )
    : [];

  const canCompare = sorted.length > 1;
  const hasPlaces = sorted.length > 0;

  return (
    <div className="min-w-0 pb-12">
      {/* =====================================================
          COLLECTION HEADER
      ===================================================== */}
      <header className="border-b border-border pb-9 sm:pb-11">
        {/* Main title and collection count */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Page heading and description */}
            <div className="max-w-2xl">
              <h1 className="type-page-title text-foreground">
                Your shortlist<span className="text-primary">.</span>
              </h1>

              <p className="mt-4 max-w-lg text-body text-muted-foreground">
                Keep the places that caught your eye, compare what matters, and
                take the next step when you're ready.
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                Saved on this device.
              </p>
            </div>
          </div>

          {/* Actual number of saved listings */}
          <div className="flex shrink-0 flex-col items-end gap-5">
            {/* Explore rentals — top right */}
            <Link
              to={PATHS.search}
              className="group inline-flex items-center gap-2 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Explore rentals
              <ArrowUpRight
                className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </Link>

            {/* Collection count */}
            <div className="flex items-end gap-3 border-l-2 border-primary pl-5">
              <span
                className="font-display text-[3.75rem] font-semibold leading-none tracking-[-0.07em] text-foreground tabular-nums"
                aria-label={
                  loading
                    ? "Loading saved places"
                    : pluralize(sorted.length, "saved place")
                }
              >
                {loading ? "—" : sorted.length}
              </span>

              <div className="pb-1">
                <span className="block text-caption font-semibold text-primary">
                  Collection
                </span>

                <span className="mt-1 block text-xs text-muted-foreground">
                  {sorted.length === 1 ? "Saved place" : "Saved places"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN COLLECTION WORKSPACE
      ===================================================== */}
      <div className="grid min-w-0 gap-12 pt-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        {/* =================================================
            LEFT — SAVED PROPERTIES
        ================================================= */}
        <div className="min-w-0">
          {/* Collection toolbar */}
          <div className="mb-7 flex flex-col gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Saved properties
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {loading
                  ? "Loading your collection..."
                  : hasPlaces
                    ? `${pluralize(sorted.length, "place")} ready to review`
                    : "Your collection starts here"}
              </p>
            </div>

            {/* View and sorting controls */}
            {canCompare && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {/* View switcher */}
                <div
                  role="group"
                  aria-label="Saved places view"
                  className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-1"
                >
                  {(
                    [
                      ["grid", "Cards", LayoutGrid],
                      ["compare", "Compare", Columns3],
                    ] as const
                  ).map(([value, label, Icon]) => {
                    const selected = view === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setView(value)}
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-md px-3",
                          "text-xs font-semibold",
                          "transition-[color,background-color,box-shadow] duration-200",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          selected
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon
                          className="size-3.5"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />

                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Sorting */}
                <Select
                  value={sort}
                  onValueChange={(value) => setSort(value as Sort)}
                >
                  <SelectTrigger
                    aria-label="Sort saved places"
                    className="h-10 w-[155px] rounded-lg border-border bg-card text-xs font-medium sm:w-42"
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent align="end">
                    <SelectItem value="saved">Recently saved</SelectItem>

                    <SelectItem value="price-asc">Lowest rent</SelectItem>

                    <SelectItem value="price-desc">Highest rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* =============================================
              UNAVAILABLE LISTING NOTICE
          ============================================= */}
          {unavailable.length > 0 && (
            <div className="mb-7 flex flex-col gap-4 border-l-[3px] border-warning bg-warning/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {unavailable.length === 1
                    ? "1 saved place is no longer listed"
                    : `${unavailable.length} saved places are no longer listed`}
                </p>

                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  These properties may have been rented out or removed by their
                  landlords.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={removeMany.isPending}
                onClick={() => removeMany.mutate(unavailable)}
                className="h-9 shrink-0 rounded-lg bg-background text-xs font-semibold"
              >
                Remove from saved
              </Button>
            </div>
          )}

          {/* =============================================
              COLLECTION CONTENT
          ============================================= */}
          {loading ? (
            <ListingGridSkeleton count={3} />
          ) : favorites.isError || listings.isError ? (
            <ErrorState
              onRetry={() => {
                void favorites.refetch();
                void listings.refetch();
              }}
            />
          ) : !hasPlaces ? (
            /* ==========================================
                EMPTY COLLECTION
            ========================================== */
            <div className="grid min-h-[25rem] overflow-hidden border-y border-border bg-muted/20 sm:grid-cols-[0.8fr_1.2fr]">
              {/* Minimal illustration */}
              <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-muted/50 p-8 sm:min-h-full">
                <div
                  aria-hidden="true"
                  className="relative flex size-36 items-center justify-center border border-border/80 bg-background sm:size-44"
                >
                  <Heart
                    className="size-16 text-primary/30 sm:size-20"
                    strokeWidth={0.9}
                  />

                  <span className="absolute -bottom-3 -right-3 flex size-11 items-center justify-center bg-primary text-primary-foreground">
                    <span className="font-display text-sm font-semibold tabular-nums">
                      00
                    </span>
                  </span>
                </div>

                <span className="absolute bottom-5 left-5 text-caption font-semibold text-muted-foreground">
                  Your collection
                </span>
              </div>

              {/* Empty state explanation */}
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <span className="text-caption font-semibold text-primary">
                  A fresh start
                </span>

                <h3 className="mt-4 max-w-sm font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {unavailable.length
                    ? "Your saved places aren't listed right now."
                    : "A little room for possibility."}
                </h3>

                <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
                  Browse rentals and tap the heart on places you like. They'll
                  appear here so you can compare rent, location, rules, and
                  move-in costs.
                </p>

                <Button
                  asChild
                  size="lg"
                  className="mt-7 h-11 w-fit gap-2 rounded-lg px-6 text-sm font-semibold"
                >
                  <Link to={PATHS.search}>
                    <Search
                      className="size-4"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    Find places
                    <ArrowRight
                      className="size-4"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              </div>
            </div>
          ) : view === "compare" && canCompare ? (
            /* ==========================================
                SIDE-BY-SIDE COMPARISON
            ========================================== */
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
                <div>
                  <span className="text-caption font-semibold text-primary">
                    Compare your options
                  </span>

                  <h3 className="mt-2 font-heading text-lg font-semibold tracking-tight text-foreground">
                    Find the right fit.
                  </h3>
                </div>

                <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                  Review your saved properties side by side before contacting a
                  landlord.
                </p>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <CompareTable listings={sorted} />
              </div>
            </div>
          ) : (
            /* ==========================================
                SAVED PROPERTY GRID
            ========================================== */
            <ul className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 2xl:grid-cols-3">
              {sorted.map((listing) => (
                <li key={listing.id} className="flex min-w-0 flex-col">
                  {/* Existing redesigned listing card */}
                  <ListingCard listing={listing} />

                  {/* Saved metadata and inquiry action */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/70 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                      <Bookmark
                        className="size-3.5"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      Saved{" "}
                      {formatRelative(
                        savedAt.get(listing.id) ?? listing.updatedAt,
                      )}
                    </span>

                    <InquiryDialog listing={listing}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 rounded-full border-border px-3 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <MessageSquare
                          className="size-3.5"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        Ask landlord
                      </Button>
                    </InquiryDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Bottom detail */}
          {!loading && hasPlaces && view === "grid" && (
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <p className="text-xs leading-6 text-muted-foreground">
                Your next place might already be in your shortlist.
              </p>

              <Link
                to={PATHS.search}
                className="group inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline hover:underline-offset-4"
              >
                Keep exploring
                <ArrowUpRight
                  className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
        </div>

        {/* =================================================
            RIGHT — SAVED SEARCHES RAIL
        ================================================= */}
        <aside
          aria-labelledby="saved-searches-title"
          className="min-w-0 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:h-fit"
        >
          <div className="border-t-2 border-primary pt-5">
            {/* Sidebar header */}
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <span className="text-caption font-semibold text-muted-foreground">
                  Your preferences
                </span>

                <h2
                  id="saved-searches-title"
                  className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground"
                >
                  Saved searches
                </h2>
              </div>

              <Bookmark
                className="mt-1 size-5 shrink-0 text-primary"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </div>

            <p className="mb-6 text-xs leading-6 text-muted-foreground">
              Keep your preferred search filters close so you can revisit them
              easily.
            </p>

            {/* Original saved search functionality */}
            <SavedSearchList />

            {/* Helpful context */}
            <div className="mt-8 border-t border-border pt-6">
              <span className="text-caption font-semibold text-primary">
                A quick reminder
              </span>

              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                Before choosing a place, compare the total move-in cost,
                property rules, location, and availability.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export { FavoritesPage as Component };
