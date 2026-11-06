import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  GraduationCap,
  MapPinned,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router";
import { SectionHeading } from "@/components/common/page-header";
import { Photo } from "@/components/common/photo";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { ListingGridSkeleton } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/constants/app";
import { PROPERTY_TYPE_ORDER, PROPERTY_TYPES } from "@/constants/listing";
import { ListingCard } from "@/features/listings/listing-card";
import { studentTypesFirst } from "@/features/listings/listing-utils";
import {
  useFeaturedListings,
  useMunicipalities,
  useUniversities,
} from "@/features/listings/queries";
import { formatPeso, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { places } from "@/services";
import { GulfMap } from "./gulf-map";
import { searchUrl } from "./search-params";

/** A taste of the list; the full one lives on the schools page. */
const SCHOOL_PREVIEW = 6;

/** The space above a section that sits directly on the page ground. */
const sectionSpacing = "pt-20 sm:pt-24 lg:pt-28";

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

/** Schools as a dense two-column index: name, campus, count. */
export function NearSchoolsSection() {
  const { data, isPending } = useUniversities();
  const schools = data ?? [];

  return (
    <section
      id="near-schools"
      aria-labelledby="near-schools-title"
      className={cn("container-page scroll-mt-24", sectionSpacing)}
    >
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-16">
        <div className="lg:sticky lg:top-28">
          <SectionEyebrow
            className="mb-4 gap-3"
            marker={
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
            }
          >
            For students
          </SectionEyebrow>

          <h2 id="near-schools-title" className="type-display">
            Live closer.
            <span className="block text-primary">Study easier.</span>
          </h2>

          <p className="mt-4 max-w-sm text-body text-muted-foreground">
            Find a place near your campus. Distances are measured from each
            school, so you can compare a short walk with a longer commute before
            you visit.
          </p>
        </div>

        <div className="min-w-0">
          <SubsectionHeading
            className="mb-5 border-b border-border pb-4"
            label="Find your campus"
            title="Explore schools nearby"
            count={
              !isPending && schools.length > 0
                ? pluralize(schools.length, "school")
                : undefined
            }
          />

          {isPending ? (
            <ul
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              aria-label="Loading schools"
            >
              {Array.from({ length: SCHOOL_PREVIEW }, (_, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-6 h-9 w-28" />
                </li>
              ))}
            </ul>
          ) : schools.length === 0 ? (
            <EmptyState
              compact
              headingLevel="h3"
              icon={GraduationCap}
              title="No schools listed yet"
              description="School-based browsing will appear here once campus information becomes available."
              className="rounded-2xl border border-dashed border-border"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {schools.slice(0, SCHOOL_PREVIEW).map((school) => (
                <li key={school.id} className="min-w-0">
                  <Link
                    to={PATHS.near(school.slug)}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6"
                  >
                    <h4 className="line-clamp-2 type-card-title transition-colors group-hover:text-primary">
                      {school.shortName}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 text-meta text-muted-foreground">
                      {school.campus},{" "}
                      {places.municipalityName(school.municipalityId)}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                      <div className="min-w-0">
                        <span className="block text-caption text-muted-foreground">
                          Nearby listings
                        </span>
                        <span className="mt-0.5 block text-body font-semibold tabular-nums">
                          {pluralize(school.listingCount, "place")}
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-meta font-semibold text-primary">
                        Explore
                        <ArrowUpRight
                          className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!isPending && schools.length > SCHOOL_PREVIEW && (
            <p className="mt-5">
              <Link to={PATHS.schools} className={textLink}>
                See all {schools.length} schools
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** A plain, even grid so listings stay easy to compare. */
export function FeaturedListingsSection() {
  const { data: raw, isPending, isError, refetch } = useFeaturedListings();
  const data = studentTypesFirst(raw ?? []);
  return (
    <section
      className="container-page pt-4 sm:pt-6"
      aria-labelledby="featured-title"
    >
      <SectionEyebrow>Featured places</SectionEyebrow>

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
          <ListingGridSkeleton count={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          // Phones swipe through a strip; wider screens get an even grid.
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {data.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                className="w-[82%] shrink-0 snap-start sm:w-auto"
              />
            ))}
          </div>
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
      className={cn("container-page", sectionSpacing)}
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

export function CategoriesSection() {
  const [featuredType, setFeaturedType] = useState<
    (typeof PROPERTY_TYPE_ORDER)[number]
  >(PROPERTY_TYPE_ORDER[0]!);

  const featuredProperty = PROPERTY_TYPES[featuredType];

  return (
    <section
      className={cn("container-page", sectionSpacing)}
      aria-labelledby="categories-title"
    >
      <SplitSectionIntro
        eyebrow="Property types"
        titleId="categories-title"
        title="Find the space that fits you."
        description="From shared rooms to private homes, explore different living spaces across Pangasinan."
      />

      <div className="grid min-w-0 grid-cols-1 border-y border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 py-3 lg:py-6 lg:pr-10 xl:pr-14">
          <nav aria-label="Browse property types">
            <ul className="divide-y divide-border">
              {PROPERTY_TYPE_ORDER.map((type) => {
                const property = PROPERTY_TYPES[type];
                const active = featuredType === type;

                return (
                  <li key={type}>
                    <Link
                      to={searchUrl({ types: [type] })}
                      onMouseEnter={() => setFeaturedType(type)}
                      onFocus={() => setFeaturedType(type)}
                      className="group flex min-w-0 items-center justify-between gap-5 py-5 sm:py-6"
                    >
                      <div className="min-w-0">
                        <h3
                          className={cn(
                            "type-subsection transition-colors group-hover:text-primary",
                            active && "lg:text-primary",
                          )}
                        >
                          {property.plural}
                        </h3>
                        <p className="mt-1 max-w-sm text-body text-muted-foreground">
                          {property.description}
                        </p>
                      </div>

                      <ArrowUpRight
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary",
                          "motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5",
                          active && "lg:text-primary",
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="hidden min-w-0 flex-col justify-between border-l border-border px-8 py-8 lg:flex xl:px-12 xl:py-10">
          <div className="flex flex-1 items-center justify-center pb-10">
            <svg
              viewBox="0 0 520 350"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-auto w-full max-w-116 text-foreground/60"
              aria-hidden="true"
            >
              <g
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Main building structure */}
                <path d="M100 285V100H351V285" />
                <path d="M94 100H357" />
                <path d="M108 93H343" />
                <path d="M108 93V100M343 93V100" />

                {/* Side extension */}
                <path d="M351 150H436V285" />
                <path d="M345 144H442" />
                <path d="M436 150V285" />

                {/* Horizontal building divisions */}
                <path d="M100 191H351" />
                <path d="M100 198H351" />

                {/* Architectural columns */}
                <path d="M118 100V285" />
                <path d="M333 100V285" />

                {/* Upper windows */}
                <rect x="144" y="121" width="59" height="52" />
                <rect x="248" y="121" width="59" height="52" />

                {/* Window frames */}
                <path d="M173.5 121V173M144 147H203" />
                <path d="M277.5 121V173M248 147H307" />

                {/* Lower windows */}
                <rect x="144" y="218" width="59" height="48" />
                <path d="M173.5 218V266M144 242H203" />

                {/* Main entrance */}
                <path d="M245 285V216H307V285" />
                <path d="M251 285V222H301V285" />
                <path d="M285 222V285" />
                <circle cx="293" cy="256" r="1.8" />

                {/* Side extension windows */}
                <rect x="373" y="174" width="39" height="39" />
                <rect x="373" y="229" width="39" height="39" />
                <path d="M392.5 174V213M373 193.5H412" />
                <path d="M392.5 229V268M373 248.5H412" />

                {/* Building base */}
                <path d="M85 285H453" />
                <path d="M90 291H448" />

                {/* Steps */}
                <path d="M237 285V294H316V285" />
                <path d="M229 294V301H324V294" />
                <path d="M219 301H334" />

                {/* Roof detailing */}
                <path d="M119 110H331" />
                <path d="M359 160H430" />

                {/* Left landscaping */}
                <path d="M72 285V249" />
                <path d="M72 249C51 249 47 226 61 215" />
                <path d="M72 249C91 243 95 222 81 210" />
                <path d="M72 231C59 222 61 208 69 204" />
                <path d="M72 232C85 226 87 211 79 203" />

                {/* Right landscaping */}
                <path d="M463 285V253" />
                <path d="M463 253C447 250 446 232 455 225" />
                <path d="M463 253C480 247 484 232 473 222" />
                <path d="M463 240C454 231 456 220 461 215" />

                {/* Ground */}
                <path d="M43 309H477" />
                <path d="M56 315H158M372 315H464" />
              </g>

              {/* Fine architectural details */}
              <g stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.4">
                <path d="M137 121V173M210 121V173" />
                <path d="M241 121V173M314 121V173" />
                <path d="M137 218V266M210 218V266" />
                <path d="M94 88H357" />
                <path d="M94 88V94M357 88V94" />
                <path d="M359 139H440" />
              </g>
            </svg>
          </div>

          <div className="border-t border-border pt-6">
            <p className="text-caption font-semibold text-muted-foreground">
              Currently exploring
            </p>
            <h3 className="mt-1.5 type-section-title">
              {featuredProperty.plural}
            </h3>
            <p className="mt-2 max-w-sm text-body text-muted-foreground">
              {featuredProperty.description}
            </p>
            <p className="mt-4">
              <Link
                to={searchUrl({ types: [featuredType] })}
                className={textLink}
              >
                Explore places
              </Link>
            </p>
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
      className="mt-20 border-y border-border bg-pan py-14 sm:mt-24 sm:py-16 lg:mt-28 lg:py-20"
      aria-labelledby="how-title"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:gap-14">
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
          <ol className="min-w-0 divide-y divide-foreground/15">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="py-5 first:pt-0 last:pb-0 sm:py-6 xl:py-7"
              >
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 xl:grid-cols-[2.5rem_minmax(0,11rem)_minmax(0,1fr)] xl:gap-x-6">
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
      className="bg-ink py-14 text-white sm:py-16 lg:py-20"
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
      className={cn("container-page pb-16 sm:pb-20", sectionSpacing)}
      aria-labelledby="landlord-cta-title"
    >
      <div className="relative isolate flex min-h-96 flex-col justify-end overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-8 lg:min-h-108 lg:p-10 xl:p-12">
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
