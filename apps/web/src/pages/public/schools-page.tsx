import { GraduationCap } from "lucide-react"
import { Link } from "react-router"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { useUniversities } from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { pluralize } from "@/lib/format"
import { places } from "@/services"

type School = NonNullable<ReturnType<typeof useUniversities>["data"]>[number]

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"

function SchoolLink({ school }: { school: School }) {
  return (
    <Link
      to={PATHS.near(school.slug)}
      className="flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="type-card-title block truncate">{school.shortName}</span>
        <span className="block truncate text-meta text-muted-foreground">
          {school.campus}, {places.municipalityName(school.municipalityId)}
        </span>
        <span className="mt-1 block text-meta font-semibold">{pluralize(school.listingCount, "place")} nearby</span>
      </span>
    </Link>
  )
}

function SchoolsPage() {
  useDocumentTitle("Rentals near schools")
  const { data: schools, isPending, isError, refetch } = useUniversities()

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Find a place near your school"
        description="Pick your campus to see places around it, closest first. Distances are straight-line estimates, for comparison only."
      />

      <div className="mt-10">
        {isPending ? (
          <ul className={GRID} aria-label="Loading schools">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-24 rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : schools.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No schools listed yet" description="Schools will appear here once campus information is available." />
        ) : (
          <ul className={GRID}>
            {schools.map((school) => (
              <li key={school.id} className="min-w-0">
                <SchoolLink school={school} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { SchoolsPage as Component }
