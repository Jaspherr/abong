import { useQuery } from "@tanstack/react-query"
import { Building2, Clock, Languages, MessageCircleReply, UserX } from "lucide-react"
import { Link, useParams } from "react-router"
import { StatusBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { ListingGridSkeleton } from "@/components/feedback/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { ListingCard } from "@/features/listings/listing-card"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate, formatPercent, pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { landlordsService, places } from "@/services"
import type { VerificationType } from "@/types"

function LandlordProfilePage() {
  const { id = "" } = useParams()
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.landlord(id), queryFn: () => landlordsService.getPublicProfile(id) })
  useDocumentTitle(data?.profile.displayName)

  if (isError) {
    return (
      <div className="container-page py-16">
        {(error as { code?: string }).code === "not-found" ? (
          <EmptyState icon={UserX} headingLevel="h1" title="Landlord not found" description="This profile may have been removed." action={<Button asChild><Link to={PATHS.search}>Browse places</Link></Button>} />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        )}
      </div>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-14">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {isPending ? (
            <Skeleton className="h-96 rounded-3xl" />
          ) : (
            <div className="space-y-6 rounded-3xl bg-card p-6 shadow-card">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                <UserAvatar name={data.profile.displayName} className="size-16 text-xl lg:size-20 lg:text-2xl" />
                <div>
                  <h1 className="type-page-title">{data.profile.displayName}</h1>
                  {data.profile.businessName && <p className="text-muted-foreground">{data.profile.businessName}</p>}
                </div>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5">
                  <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                  {places.municipalityName(data.profile.municipalityId)}, landlord since {formatDate(data.profile.memberSince, "yyyy")}
                </li>
                <li className="flex items-center gap-2.5">
                  <MessageCircleReply className="size-4 text-muted-foreground" aria-hidden="true" />
                  Answers {formatPercent(data.profile.responseRate)} of inquiries
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                  Usually replies within {data.profile.responseTimeHours <= 1 ? "an hour" : `${data.profile.responseTimeHours} hours`}
                </li>
                <li className="flex items-center gap-2.5">
                  <Languages className="size-4 text-muted-foreground" aria-hidden="true" />
                  {data.profile.languages.join(", ")}
                </li>
              </ul>
              <div className="space-y-2 border-t border-border pt-5">
                <h2 className="font-sans text-sm font-semibold">Verification</h2>
                <ul className="space-y-2">
                  {(Object.keys(VERIFICATION_TYPES) as VerificationType[]).map((type) => {
                    const meta = VERIFICATION_STATUS[data.profile.verifications[type]]
                    return (
                      <li key={type} className="flex items-center justify-between text-sm">
                        <span>{VERIFICATION_TYPES[type].label}</span>
                        <StatusBadge tone={meta.tone === "success" ? "success" : "neutral"}>{meta.label}</StatusBadge>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-10">
          {isPending ? (
            <Skeleton className="h-24" />
          ) : (
            <section className="space-y-3">
              <h2 className="type-subsection">About</h2>
              <p className="max-w-prose leading-relaxed text-foreground/85">{data.profile.bio || "This landlord hasn't written an introduction yet."}</p>
              <p className="text-sm text-muted-foreground">
                {pluralize(data.stats.activeListings, "active listing")}, {pluralize(data.stats.availableUnits, "unit")} open of{" "}
                {data.stats.totalUnits}
              </p>
            </section>
          )}
          <section className="space-y-6">
            <h2 className="type-subsection">Places for rent</h2>
            {isPending ? (
              <ListingGridSkeleton count={2} className="lg:grid-cols-2" />
            ) : data.listings.length === 0 ? (
              <EmptyState compact icon={Building2} title="No active listings" description="Check back later. This landlord has no places open right now." />
            ) : (
              <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2">
                {data.listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export { LandlordProfilePage as Component }
