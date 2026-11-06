import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Flag, ShieldCheck, UsersRound } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { LineTabs } from "@/components/common/line-tabs"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { TableSkeleton } from "@/components/feedback/skeletons"
import { SearchInput } from "@/components/forms/search-input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PATHS } from "@/constants/app"
import { VerificationChecks } from "@/features/admin/verification-checks"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { adminService, places, type AdminLandlordRow } from "@/services"
import type { VerificationType } from "@/types"

type Filter = "all" | "verified" | "incomplete" | "reported"

const TYPES: VerificationType[] = ["identity", "contact", "property"]

const fullyVerified = (row: AdminLandlordRow) =>
  TYPES.every((type) => row.profile.verifications[type] === "verified")

const FILTERS: Record<Filter, { label: string; match: (row: AdminLandlordRow) => boolean }> = {
  all: { label: "All", match: () => true },
  verified: { label: "Fully verified", match: fullyVerified },
  incomplete: { label: "Incomplete", match: (row) => !fullyVerified(row) },
  reported: { label: "With reports", match: (row) => row.openReports > 0 },
}

/** Report counts remain linked to the existing admin reports route. */
function ReportCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground">None</span>
  }

  return (
    <Link
      to={PATHS.admin.reports}
      className="inline-flex items-center gap-1.5 font-medium text-destructive underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      aria-label={`${pluralize(count, "report")}. Open reports`}
    >
      <Flag className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="tabular-nums">{pluralize(count, "report")}</span>
    </Link>
  )
}

/** The same real destinations are present on both desktop and mobile. */
function LandlordActions({ profile }: { profile: AdminLandlordRow["profile"] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        asChild
      >
        <Link to={PATHS.admin.verifications} aria-label={`Verifications queue, opened from ${profile.displayName}`}>
          <ShieldCheck className="size-4" aria-hidden="true" />
          Verifications
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 px-2.5 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        asChild
      >
        <Link to={PATHS.landlordProfile(profile.id)} aria-label={`View public profile of ${profile.displayName}`}>
          <span>Public profile</span>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  )
}

function AdminLandlordsPage() {
  useDocumentTitle("Landlords")

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.landlords,
    queryFn: adminService.listLandlords,
  })
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const summary = useMemo(() => {
    const all = data ?? []
    return {
      total: all.length,
      verified: all.filter(fullyVerified).length,
      reported: all.filter((row) => row.openReports > 0).length,
    }
  }, [data])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data ?? [])
      .filter(
        (row) =>
          !query ||
          `${row.profile.displayName} ${row.profile.businessName ?? ""} ${row.user.email}`
            .toLowerCase()
            .includes(query),
      )
      .filter(FILTERS[filter].match)
  }, [data, search, filter])

  const filtered = search.trim() !== "" || filter !== "all"

  const clearFilters = () => {
    setSearch("")
    setFilter("all")
  }

  return (
    <div className="w-full space-y-5 pb-10">
      <AdminPageHeader
        title="Landlords"
        description="Property owners on Abong: their verification progress, properties and open reports."
        metric={<HeaderMetric loading={isPending} value={isError ? "—" : formatNumber(summary.total)} label="Landlords" />}
      />

      <section className="min-w-0 space-y-5" aria-labelledby="landlord-directory-title">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
          <h2 id="landlord-directory-title" className="type-subsection">
            Landlord directory
          </h2>

          {!isPending && !isError && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <strong className="font-semibold tabular-nums text-foreground">{formatNumber(summary.verified)}</strong> fully verified
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" aria-hidden="true" />
              <span>
                <strong className="font-semibold tabular-nums text-foreground">{formatNumber(summary.reported)}</strong> with open reports
              </span>
            </div>
          )}
        </div>

        {/* Tabs keep their original full-dataset counts, independent of search. */}
        <div className="flex min-w-0 flex-col gap-4 border-y border-border/80 py-4 sm:py-5 xl:flex-row-reverse xl:items-center xl:justify-between xl:gap-6">
          <SearchInput
            label="Search landlords"
            placeholder="Search name, business or email"
            value={search}
            onChange={setSearch}
            className="w-full xl:w-80"
          />
          <LineTabs
            label="Filter landlords"
            value={filter}
            onChange={setFilter}
            className="min-w-0 flex-1"
            tabs={(Object.keys(FILTERS) as Filter[]).map((key) => ({
              value: key,
              label: FILTERS[key].label,
              count: data?.filter(FILTERS[key].match).length,
            }))}
          />
        </div>

        {!isPending && !isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground" aria-live="polite">
            <span>
              {pluralize(rows.length, "landlord")} {filtered ? "matching your filters" : "in the directory"}
            </span>
            {filtered && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        <div className="min-w-0">
          {isPending ? (
            <TableSkeleton />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <div className="border-b border-border/80 py-8">
              <EmptyState
                compact
                icon={UsersRound}
                title={filtered ? "No landlords match" : "No landlords yet"}
                description={filtered ? "Try another name or filter." : "Landlord accounts will appear here when available."}
              />
              {filtered && (
                <div className="mt-3 flex justify-center">
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: show all meaningful directory details, no compressed table. */}
              <ul aria-label="Landlords" className="divide-y divide-border/75 border-b border-border/80 lg:hidden">
                {rows.map((row) => {
                  const { profile, user, propertyCount, activeListings, openReports } = row
                  return (
                    <li key={profile.id} className="py-5 first:pt-1">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserAvatar name={profile.displayName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-[-0.015em] text-foreground">
                            {profile.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {profile.businessName ? `${profile.businessName}, ` : ""}
                            {places.municipalityName(profile.municipalityId)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border/60 pt-3 text-xs">
                        <div className="col-span-2">
                          <p className="mb-2 text-caption font-semibold text-muted-foreground">
                            Verification
                          </p>
                          <VerificationChecks compact verifications={profile.verifications} />
                        </div>
                        <div>
                          <p className="text-caption font-semibold text-muted-foreground">Properties</p>
                          <p className="mt-1 font-medium tabular-nums text-foreground">
                            {pluralize(propertyCount, "property", "properties")}
                            <span className="ml-1.5 font-normal text-muted-foreground">· {activeListings} live</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-caption font-semibold text-muted-foreground">Open reports</p>
                          <p className="mt-1"><ReportCount count={openReports} /></p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end border-t border-border/60 pt-2">
                        <LandlordActions profile={profile} />
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Desktop: restrained, data-dense table consistent with the Users page. */}
              <div className="hidden min-w-0 lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 bg-muted/25 hover:bg-muted/25">
                      <TableHead className="h-11 pl-3 text-caption font-semibold text-muted-foreground sm:pl-4">Landlord</TableHead>
                      <TableHead className="h-11 text-caption font-semibold text-muted-foreground">Verification</TableHead>
                      <TableHead className="h-11 text-right text-caption font-semibold text-muted-foreground">Properties</TableHead>
                      <TableHead className="h-11 text-right text-caption font-semibold text-muted-foreground">Live</TableHead>
                      <TableHead className="h-11 text-right text-caption font-semibold text-muted-foreground">Open reports</TableHead>
                      <TableHead className="h-11 pr-3 text-right sm:pr-4"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ profile, user, propertyCount, activeListings, openReports }) => (
                      <TableRow
                        key={profile.id}
                        className="border-border/70 transition-colors duration-150 hover:bg-muted/35 motion-reduce:transition-none"
                      >
                        <TableCell className="max-w-0 min-w-56 py-4 pl-3 whitespace-normal sm:pl-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar name={profile.displayName} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{profile.displayName}</p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {profile.businessName ? `${profile.businessName}, ` : ""}
                                {places.municipalityName(profile.municipalityId)}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <VerificationChecks compact verifications={profile.verifications} />
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground">{propertyCount}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground">{activeListings}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums"><ReportCount count={openReports} /></TableCell>
                        <TableCell className="pr-3 text-right sm:pr-4">
                          <div className="flex justify-end">
                            <LandlordActions profile={profile} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export { AdminLandlordsPage as Component }
