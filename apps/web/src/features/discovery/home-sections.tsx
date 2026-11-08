import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPinned,
  Pause,
  Play,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router";
import { SectionHeading } from "@/components/common/page-header";
import { Photo } from "@/components/common/photo";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/constants/app";
import { PROPERTY_TYPE_ORDER, PROPERTY_TYPES } from "@/constants/listing";
import { splitFeaturedListings } from "@/features/listings/listing-utils";
import {
  useFeaturedListings,
  useMunicipalities,
  useUniversities,
} from "@/features/listings/queries";
import { formatPeso, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { places } from "@/services";
import {
  FeaturedLead,
  FeaturedRow,
  FeaturedSkeleton,
} from "./featured-listings";
import { GulfMap } from "./gulf-map";
import { PropertyTypeIllustration } from "./property-type-illustration";
import { searchUrl } from "./search-params";
import { useIdleShowcase, type ShowcaseDirection } from "./use-idle-showcase";

/** A taste of the list; the full one lives on the schools page. */
const SCHOOL_PREVIEW = 6;

/** The space around a section on the page ground. Neighbours' padding adds up to the gap between them. */
const sectionSpacing = "py-10 sm:py-12 lg:py-14";

/** At least a screen tall, with the content centred in whatever height is left over. */
const fullScreen = "flex min-h-section flex-col justify-center";

const textLink =
  "text-sm font-semibold underline decoration-ink/25 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary";

/**
 * The short label that introduces a section heading: a marker, then the text.
 * The rule takes its colour from the text, so `className` retints both on dark sections.
 */
function SectionEyebrow({
  children,
  marker = <span aria-hidden="true" className="h-px w-6 shrink-0 bg-current" />,
  className,
}: {
  children: ReactNode;
  marker?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center gap-2.5 text-caption font-semibold text-primary",
        className,
      )}
    >
      {marker}
      <p>{children}</p>
    </div>
  );
}

/** A section opening with the heading on the left and its description on the right. */
function SplitSectionIntro({
  eyebrow,
  title,
  titleId,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  titleId: string;
  description: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
      <div className="min-w-0 max-w-2xl">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2 id={titleId} className="type-display">
          {title}
        </h2>
      </div>
      <p className="max-w-sm text-body text-muted-foreground">{description}</p>
    </div>
  );
}

/** A heading for one part of a section: a plain label, the title, and an optional count. */
function SubsectionHeading({
  label,
  title,
  count,
  className,
  labelClassName = "text-primary",
}: {
  label: string;
  title: string;
  count?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <p className={cn("text-caption font-semibold", labelClassName)}>
          {label}
        </p>
        <h3 className="mt-1.5 type-subsection">{title}</h3>
      </div>
      {count && (
        <span className="text-caption text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

/** Schools displayed as a minimal two-column directory. */
export function NearSchoolsSection() {
  const { data, isPending } = useUniversities();
  const schools = data ?? [];

  return (
    <section
      id="near-schools"
      aria-labelledby="near-schools-title"
      className={cn("container-page scroll-mt-24", fullScreen, sectionSpacing)}
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:min-h-section-body lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-stretch lg:gap-10 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] xl:gap-14">
        {/* LEFT — SECTION INTRODUCTION */}
        <div className="min-w-0 lg:self-center">
          <SectionEyebrow className="mb-4">For students</SectionEyebrow>

          <h2 id="near-schools-title" className="type-display">
            Live closer.
            <span className="block text-primary">Study easier.</span>
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
            Find a place near your campus. Compare nearby rentals and travel
            distances before you visit.
          </p>
        </div>

        {/* RIGHT — SCHOOL DIRECTORY */}
        <div className="flex min-w-0 flex-col">
          {/* Directory header */}

          <SubsectionHeading
            className="mb-4"
            label="Find your campus"
            title="Explore schools nearby"
            count={
              !isPending && schools.length > 0
                ? pluralize(schools.length, "school")
                : undefined
            }
          />

          {/* LOADING */}
          {isPending ? (
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 lg:flex-1 lg:auto-rows-fr"
              aria-label="Loading schools"
            >
              {Array.from({ length: SCHOOL_PREVIEW }, (_, index) => (
                <li
                  key={index}
                  className={cn(
                    "border-b border-border/70 py-5",
                    "sm:py-6 sm:odd:pr-5 sm:even:border-l",
                    "sm:even:pl-5 lg:odd:pr-7 lg:even:pl-7",
                  )}
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3.5 w-1/2" />
                  <Skeleton className="mt-6 h-4 w-24" />
                </li>
              ))}
            </ul>
          ) : schools.length === 0 ? (
            /* EMPTY STATE */
            <EmptyState
              compact
              headingLevel="h3"
              icon={GraduationCap}
              title="No schools listed yet"
              description="School-based browsing will appear here once campus information becomes available."
              className="border-y border-border"
            />
          ) : (
            /* SCHOOL INDEX */
            <ul className="grid grid-cols-1 border-t border-border/70 sm:grid-cols-2 lg:flex-1 lg:auto-rows-fr">
              {schools.slice(0, SCHOOL_PREVIEW).map((school) => (
                <li
                  key={school.id}
                  className={cn(
                    "group min-w-0 border-b border-border/60",
                    "sm:odd:pr-5 sm:even:pl-5",
                    "lg:odd:pr-7 lg:even:pl-7",
                  )}
                >
                  <Link
                    to={PATHS.near(school.slug)}
                    className={cn(
                      "flex h-full min-w-0 flex-col",
                      "py-5 sm:py-6",
                      "transition-colors",
                      "focus-visible:rounded-sm focus-visible:outline-2",
                      "focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    {/* School name and link indicator */}
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="line-clamp-2 font-heading text-[1.1rem] font-semibold leading-snug tracking-[-0.025em] text-foreground transition-colors group-hover:text-primary sm:text-[1.2rem]">
                        {school.shortName}
                      </h4>

                      <ArrowUpRight
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-[color,translate] group-hover:text-primary motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Campus and town */}
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">
                      {school.campus},{" "}
                      {places.municipalityName(school.municipalityId)}
                    </p>

                    {/* Nearby listing count */}
                    <div className="mt-auto flex items-center gap-2 pt-5">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-primary/70"
                      />

                      <span className="text-xs font-medium text-muted-foreground">
                        Nearby listings
                      </span>

                      <span className="ml-auto shrink-0 text-xs font-semibold text-foreground tabular-nums">
                        {pluralize(school.listingCount, "place")}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* VIEW ALL SCHOOLS */}
          {!isPending && schools.length > SCHOOL_PREVIEW && (
            <div className="flex justify-end pt-5">
              <Link
                to={PATHS.schools}
                className={cn(
                  "group inline-flex items-center gap-2",
                  "text-sm font-medium text-foreground",
                  "transition-colors hover:text-primary",
                  "focus-visible:rounded-sm focus-visible:outline-2",
                  "focus-visible:outline-offset-4 focus-visible:outline-ring",
                )}
              >
                See all {schools.length} schools
                <ArrowUpRight
                  className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * One lead listing beside a ruled list. The hero already shows two featured
 * places, so this section starts from the ones it hasn't shown.
 */
export function FeaturedListingsSection() {
  const { data, isPending, isError, refetch } = useFeaturedListings();
  const [lead, ...others] = splitFeaturedListings(data ?? []).rest;

  return (
    <section
      className={cn(
        "container-page pt-4 pb-10 sm:pt-6 sm:pb-12 lg:pb-14",
        fullScreen,
      )}
      aria-labelledby="featured-title"
    >
      <SectionHeading
        size="large"
        titleId="featured-title"
        title="Verified and available now"
        description="Landlords whose identity and property documents we've checked, with rooms open this month."
        action={
          <Link
            to={searchUrl({ verifiedOnly: true, availableNow: true })}
            className={textLink}
          >
            See all verified places
          </Link>
        }
      />

      <div className="mt-8 lg:mt-10">
        {isPending ? (
          <FeaturedSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !lead ? (
          <EmptyState
            compact
            headingLevel="h3"
            icon={BadgeCheck}
            title="No verified places open right now"
            description="Verified places with open rooms will appear here. You can still browse everything listed in Pangasinan."
            action={
              <Button asChild variant="outline">
                <Link to={searchUrl({})}>Browse all places</Link>
              </Button>
            }
            className="border-y border-border"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14">
              <div
                className={cn(
                  "min-w-0",
                  others.length > 0 ? "lg:col-span-7" : "lg:col-span-12",
                )}
              >
                <FeaturedLead listing={lead} />
              </div>
              {others.length > 0 && (
                <div className="min-w-0 divide-y divide-border border-t border-border pt-5 lg:col-span-5 lg:grid lg:auto-rows-fr lg:border-t-0 lg:pt-0">
                  {others.map((listing) => (
                    <FeaturedRow key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-8 text-caption text-muted-foreground">
              Move-in estimates add advance and deposit on the cheapest open
              unit. The landlord confirms the final amount.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Towns: a working map beside a list with counts and starting prices. */
export function TownsSection() {
  const { data, isPending } = useMunicipalities();

  const towns = (data ?? [])
    .filter((town) => town.listingCount > 0)
    .slice(0, 8);

  return (
    <section
      className={cn("container-page", fullScreen, sectionSpacing)}
      aria-labelledby="towns-title"
    >
      <SplitSectionIntro
        eyebrow="Where to live"
        titleId="towns-title"
        title={
          <>
            Every town has
            <span className="block text-primary">a place for you.</span>
          </>
        }
        description="Explore rental opportunities across Pangasinan. Discover different towns, compare starting prices, and find a location that feels right for you."
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-14">
        <div className="order-2 min-w-0 lg:sticky lg:top-28 lg:order-1">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="type-subsection">Explore the map</h3>
              <p className="mt-1 text-meta text-muted-foreground">
                Choose a town to browse listings
              </p>
            </div>
            <span className="text-caption text-muted-foreground">
              Positions are approximate
            </span>
          </div>

          <figure className="overflow-hidden rounded-2xl border border-border bg-pan">
            <GulfMap towns={data ?? []} />
          </figure>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <SubsectionHeading
            className="border-b border-border pb-4"
            label="Browse destinations"
            title="Popular places to rent"
            count={
              !isPending && towns.length > 0
                ? pluralize(towns.length, "town")
                : undefined
            }
          />

          {isPending ? (
            <ul className="divide-y divide-border" aria-label="Loading towns">
              {Array.from({ length: 6 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-4 py-4 sm:py-5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-36 max-w-full" />
                    <Skeleton className="h-4 w-52 max-w-full" />
                  </div>
                  <Skeleton className="h-9 w-20 shrink-0" />
                </li>
              ))}
            </ul>
          ) : towns.length === 0 ? (
            <EmptyState
              compact
              headingLevel="h3"
              icon={MapPinned}
              title="No towns to explore yet"
              description="Towns with available rental listings will appear here once they're added."
              className="mt-5 rounded-2xl border border-dashed border-border"
            />
          ) : (
            <ul className="divide-y divide-border">
              {towns.map((town) => (
                <li key={town.id} className="min-w-0">
                  <Link
                    to={searchUrl({ location: town.slug })}
                    className="group flex min-w-0 items-center gap-4 py-4 sm:gap-6 sm:py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="flex min-w-0 items-center gap-1.5 type-card-title">
                        <span className="truncate transition-colors group-hover:text-primary">
                          {town.name}
                        </span>
                        <ArrowUpRight
                          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </h4>
                      <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">
                        {town.blurb}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {town.priceFrom != null && (
                        <span className="block text-meta text-muted-foreground tabular-nums">
                          From{" "}
                          <span className="font-semibold text-foreground">
                            {formatPeso(town.priceFrom)}
                          </span>
                        </span>
                      )}
                      <span className="mt-0.5 block text-caption text-muted-foreground tabular-nums">
                        {pluralize(town.listingCount, "listing")}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!isPending && towns.length > 0 && (
            <p className="mt-5 border-t border-border pt-5">
              <Link to={searchUrl({})} className={textLink}>
                Browse all places
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Two-digit plate numbers, so "03 / 08" keeps its width from slide to slide. */
const plateNumber = (n: number) => String(n).padStart(2, "0");

/** Horizontal swipes on touch and pen; vertical movement is left to the page (`touch-action: pan-y`). */
function useSwipe(onSwipe: (direction: ShowcaseDirection) => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      start.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || from.id !== event.pointerId) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onSwipe(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

/** How long the pointer has to rest on a rail segment before it counts as a choice. */
const HOVER_INTENT_MS = 140;

/**
 * Picks an item when a mouse rests on it, not when it merely passes over, so sweeping
 * across the rail doesn't start a build for every type on the way.
 */
function useHoverIntent(pick: (index: number) => void) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (index: number) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => pick(index), HOVER_INTENT_MS);
    },
    onPointerLeave: () => window.clearTimeout(timer.current),
  });
}

/**
 * One property type per slide, like plates in an architect's portfolio: the drawing takes
 * the stage, the name and a way into the listings sit beside it, and a rail underneath
 * shows where you are. It moves on by itself while nobody is using it, and every slide
 * stays mounted in the same grid cell so changing slides can't move the page.
 */
export function CategoriesSection() {
  const {
    item: activeType,
    index: activeIndex,
    direction,
    auto,
    moved,
    running,
    canAutoplay,
    paused,
    setPaused,
    showIndex,
    step,
    containerRef,
    containerProps,
    holdProps,
  } = useIdleShowcase(PROPERTY_TYPE_ORDER);

  const swipeProps = useSwipe(step);
  const hoverPick = useHoverIntent(showIndex);
  const railRef = useRef<HTMLOListElement>(null);
  const total = PROPERTY_TYPE_ORDER.length;

  /** Arrow keys, Home and End move along the rail, taking focus with them. */
  const onRailKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const keyTargets: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      Home: 0,
      End: total - 1,
    };
    const target = keyTargets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = (target + total) % total;
    const travel =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : undefined;
    showIndex(next, travel);
    railRef.current?.querySelectorAll("button")[next]?.focus();
  };

  return (
    <section
      // Pieces of a drawing fly in from beyond its edges; clipping sideways keeps them from widening the page.
      className={cn(
        "container-page overflow-x-clip",
        fullScreen,
        sectionSpacing,
      )}
      aria-labelledby="categories-title"
    >
      <SplitSectionIntro
        eyebrow="Property types"
        titleId="categories-title"
        title="Find the space that fits you."
        description="From shared rooms to private homes, explore different living spaces across Pangasinan."
      />

      <div
        ref={containerRef}
        {...containerProps}
        role="region"
        aria-roledescription="carousel"
        aria-label="Property types"
        className="min-w-0"
        style={{ "--slide-dir": direction } as CSSProperties}
      >
        <div
          {...swipeProps}
          className="grid min-w-0 touch-pan-y grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20"
        >
          <div className="flex min-w-0 justify-center lg:justify-start">
            <PropertyTypeIllustration
              type={activeType}
              gentle={auto}
              direction={direction}
              className="w-full max-w-136 lg:max-w-170"
            />
          </div>

          <div
            {...holdProps}
            aria-live={running ? "off" : "polite"}
            className="grid min-w-0 grid-cols-1"
          >
            {PROPERTY_TYPE_ORDER.map((type, index) => {
              const property = PROPERTY_TYPES[type];
              const active = index === activeIndex;

              return (
                <div
                  key={type}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${total}`}
                  data-property-slide={type}
                  data-active={active}
                  inert={!active}
                  className={cn(
                    "min-w-0 [grid-area:1/1] [--slide-drift:0.75rem]",
                    "transition-[opacity,visibility] duration-300 ease-soft",
                    active ? "visible opacity-100" : "invisible opacity-0",
                    active && auto && "delay-150 duration-500",
                    active &&
                      moved &&
                      "animate-slide-drift [animation-delay:60ms]",
                  )}
                >
                  <p className="font-display text-price tabular-nums sm:text-metric">
                    {plateNumber(index + 1)}
                    <span className="text-muted-foreground">
                      {" "}
                      / {plateNumber(total)}
                    </span>
                  </p>
                  <h3 className="mt-4 type-page-title sm:mt-6">
                    {property.plural}
                  </h3>
                  <p className="mt-3 max-w-sm text-lead text-muted-foreground">
                    {property.description}
                  </p>
                  <Link
                    to={searchUrl({ types: [type] })}
                    className="group mt-6 inline-flex items-center gap-2 border-b border-ink/25 pb-1 text-body font-semibold transition-colors hover:border-primary hover:text-primary sm:mt-8"
                  >
                    Explore {property.plural.toLowerCase()}
                    <ArrowUpRight
                      className={cn(
                        "size-4 shrink-0 transition-[color,translate]",
                        "motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5",
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div
          {...holdProps}
          className="mt-8 flex min-w-0 items-center gap-4 sm:gap-8 lg:mt-12"
        >
          <ol
            ref={railRef}
            aria-label="Choose a property type"
            onKeyDown={onRailKeyDown}
            className="grid min-w-0 flex-1 grid-cols-8 gap-1.5 sm:gap-2"
          >
            {PROPERTY_TYPE_ORDER.map((type, index) => {
              const property = PROPERTY_TYPES[type];
              const active = index === activeIndex;

              return (
                <li key={type} className="min-w-0">
                  <button
                    type="button"
                    aria-label={property.plural}
                    aria-current={active ? "true" : undefined}
                    tabIndex={active ? 0 : -1}
                    onClick={() => showIndex(index)}
                    {...hoverPick(index)}
                    className="group block w-full min-w-0 cursor-pointer py-3 text-left outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block h-0.5 rounded-full transition-colors",
                        "group-focus-visible:ring-3 group-focus-visible:ring-ring/40",
                        active
                          ? "bg-primary"
                          : "bg-border group-hover:bg-ink/35",
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-3 hidden truncate text-caption transition-colors xl:block",
                        active
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {property.plural}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex shrink-0 items-center gap-1">
            {canAutoplay && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                onClick={() => setPaused(!paused)}
                className="text-muted-foreground"
              >
                {paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous property type"
              onClick={() => step(-1)}
              className="rounded-full"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next property type"
              onClick={() => step(1)}
              className="rounded-full"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Search near where you'll be",
    body: "Start from your school, workplace or town and filter by budget, CR, aircon, curfew and more.",
  },
  {
    title: "Compare what matters",
    body: "See advance, deposit, minimum stay and house rules up front, not after the visit.",
  },
  {
    title: "Ask the landlord",
    body: "Send questions from the listing. Replies and history stay in your inquiries.",
  },
  {
    title: "Visit before you pay",
    body: "Request a viewing time. Pay advance and deposit only after you've seen the place.",
  },
];

/** The four steps in order; the numbers are there because this really is a sequence. */

export function HowItWorksSection() {
  return (
    <section
      className={cn(
        "mt-10 border-y border-border bg-pan py-14 sm:mt-12 sm:py-16 lg:mt-14 lg:py-20",
        fullScreen,
      )}
      aria-labelledby="how-title"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:min-h-section-body lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:gap-14">
          {/* LEFT — MATCHES STEPS HEIGHT */}
          <div className="flex flex-col justify-center rounded-2xl bg-ink p-7 text-white sm:p-9 xl:p-11">
            <SectionEyebrow className="text-white/65">
              Step by step
            </SectionEyebrow>

            <h2 id="how-title" className="max-w-[14ch] type-display">
              How renting through Abong works.
            </h2>

            <p className="mt-4 max-w-sm text-body text-white/65">
              From finding a place to making your next move, see how the process
              comes together.
            </p>
          </div>

          {/* RIGHT — FOUR STEPS */}
          <ol className="min-w-0 divide-y divide-foreground/15 lg:grid lg:auto-rows-fr">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="py-5 first:pt-0 last:pb-0 sm:py-6 lg:flex lg:items-center xl:py-7"
              >
                <div className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 xl:grid-cols-[2.5rem_minmax(0,11rem)_minmax(0,1fr)] xl:gap-x-6">
                  <span
                    aria-hidden="true"
                    className="font-display text-metric text-primary"
                  >
                    {index + 1}
                  </span>

                  <h3 className="type-subsection">{step.title}</h3>

                  <p className="col-start-2 mt-1.5 max-w-md text-body text-muted-foreground xl:col-start-3 xl:mt-0">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  {
    title: "Verified means checked",
    body: "The mark appears only after we review a landlord's government ID and proof they own or manage the property.",
  },
  {
    title: "Availability you can trust",
    body: "Landlords confirm availability regularly. Listings that go quiet are flagged so you don't chase rooms that are gone.",
  },
  {
    title: "Report anything off",
    body: "Asked to pay a reservation fee before a viewing? Report the listing. Our team reviews every report.",
  },
];

export function TrustSection() {
  return (
    <section
      className={cn("bg-ink py-14 text-white sm:py-16 lg:py-20", fullScreen)}
      aria-labelledby="trust-title"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 items-end gap-8 border-b border-white/15 pb-10 sm:pb-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:pb-14">
          <div className="min-w-0">
            <SectionEyebrow className="text-mango">
              Avoid rental scams
            </SectionEyebrow>
            <h2 id="trust-title" className="max-w-[19ch] type-display">
              Renting from a stranger takes trust.
              <span className="block text-mango">Check first.</span>
            </h2>
          </div>

          <div className="max-w-md space-y-3">
            <p className="text-lead font-medium text-white/85">
              Most rental scams ask for money before you've seen the room.
            </p>
            <p className="text-body text-white/65">
              On Abong you never pay through the platform, and legitimate
              landlords don't ask for payment before a viewing.
            </p>
            <p className="text-body text-white/85">
              Your safety matters more than securing a place in a hurry.
            </p>
          </div>
        </div>

        <div className="pt-8 sm:pt-10">
          <SubsectionHeading
            className="mb-6"
            labelClassName="text-mango"
            label="The essentials"
            title="Know what to look out for."
          />

          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-10">
            {TRUST.map(({ title, body }) => (
              <li key={title} className="min-w-0">
                <h4 className="type-card-title">{title}</h4>
                <p className="mt-1.5 max-w-md text-body text-white/65">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-5 rounded-2xl bg-mango-soft p-5 text-mango-foreground sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-start gap-4">
            <ShieldAlert
              className="mt-0.5 size-6 shrink-0"
              aria-hidden="true"
            />
            <div className="max-w-lg">
              <p className="text-caption font-semibold">Before you commit</p>
              <h3 className="mt-1 type-subsection">
                Make an informed decision.
              </h3>
              <p className="mt-1.5 text-body">
                Learn to recognize warning signs and protect yourself throughout
                the renting process.
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link to="/safety">Read the safety guide</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const LANDLORD_FEATURES = [
  "Free property listings",
  "Room and bedspace management",
  "Inquiries and viewing schedules",
];

export function LandlordCtaSection() {
  return (
    <section
      className={cn(
        "container-page pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-28",
        fullScreen,
      )}
      aria-labelledby="landlord-cta-title"
    >
      {/* The photo takes whatever height the section has left. */}
      <div className="relative isolate flex min-h-96 flex-1 flex-col justify-end overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-8 lg:min-h-108 lg:p-10 xl:p-12">
        <Photo
          src="/photos/exterior-01.webp"
          alt="Low-rise residential building with balconies"
          className="absolute inset-0 size-full"
          imgClassName="size-full object-cover"
        />

        {/* Keeps the text readable wherever it lands on the photo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/80 via-black/45 to-black/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/15"
        />

        <div className="relative max-w-2xl">
          <SectionEyebrow className="text-white/85">
            List for free
          </SectionEyebrow>
          <h2 id="landlord-cta-title" className="type-display">
            Have a place to rent?
            <span className="block text-white/75">Make it known.</span>
          </h2>
          <p className="mt-4 max-w-md text-body text-white/85">
            From a single bedspace to an entire property, find a simpler way to
            reach people looking for somewhere to live.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_auto] lg:items-center lg:gap-8">
        <div className="max-w-md">
          <h3 className="type-subsection">
            Less time organizing.
            <span className="block text-muted-foreground">
              More time managing your property.
            </span>
          </h3>
          <p className="mt-2 text-body text-muted-foreground">
            List your boarding house, apartment, or home for free. Manage rooms,
            bedspaces, inquiries, and viewing schedules from one dashboard.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
          {LANDLORD_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-body">
              <Check
                className="mt-1 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <Button asChild size="lg">
            <Link to={`${PATHS.register}?role=landlord`}>
              List your property
            </Link>
          </Button>
          <Link
            to="/for-landlords"
            className={cn(textLink, "py-2 text-center")}
          >
            How it works for landlords
          </Link>
        </div>
      </div>
    </section>
  );
}
