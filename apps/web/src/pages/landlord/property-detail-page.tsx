import { Archive, ArrowLeft, CalendarCheck, ExternalLink, SearchX, Send } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { LineTabs } from "@/components/common/line-tabs"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { PROPERTY_TYPES } from "@/constants/listing"
import { LISTING_STATUS, VERIFICATION_STATUS } from "@/constants/status"
import { PropertyForm } from "@/features/landlord/property-form"
import { PropertyRenters } from "@/features/landlord/property-renters"
import { useInvalidateProperties, useLandlordId, useLandlordProperty, useLandlordRentals, usePropertyAction } from "@/features/landlord/queries"
import { UnitsManager } from "@/features/landlord/units-manager"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber, formatRelative } from "@/lib/format"
import { places, propertiesService } from "@/services"

const STATUS_HELP: Record<string, string> = {
  draft: "Only you can see this property. Submit it for review when the details and units are ready.",
  "pending-review": "Our team is checking the listing. This usually takes 1–2 days.",
  active: "Live in search. Confirm availability every week or two so renters trust it.",
  rejected: "The listing needs changes before it can go live. Update the details and submit again.",
  suspended: "Hidden from search while we review a report. Contact support for details.",
  archived: "Hidden from search. Restore it to edit and resubmit.",
}

type Tab = "units" | "details"

function PropertyDetailPage() {
  const { id = "" } = useParams()
  const landlordId = useLandlordId()
  const { data: property, isPending, isError, error, refetch } = useLandlordProperty(id)
  const invalidate = useInvalidateProperties()
  const rentals = useLandlordRentals()
  const [tab, setTab] = useState<Tab>("units")
  useDocumentTitle(property?.name)

  const submit = usePropertyAction((lid, pid: string) => propertiesService.submitForReview(lid, pid))
  const confirm = usePropertyAction((lid, pid: string) => propertiesService.confirmAvailability(lid, pid))
  const archive = usePropertyAction((lid, a: { pid: string; archived: boolean }) => propertiesService.setArchived(lid, a.pid, a.archived))

  if (isPending) return <Skeleton className="h-[70vh] rounded-xl" />
  if (isError) {
    return (error as { code?: string }).code === "not-found" ? (
      <EmptyState icon={SearchX} headingLevel="h1" title="Property not found" action={<Button asChild><Link to={PATHS.landlord.properties}>Back to properties</Link></Button>} />
    ) : (
      <ErrorState onRetry={() => refetch()} />
    )
  }

  const canSubmit = property.status === "draft" || property.status === "rejected"
  const live = property.status === "active"

  return (
    <div className="space-y-6 pb-8">
      <Link to={PATHS.landlord.properties} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Properties
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Photo src={property.photos[0]?.src} alt="" className="size-16 shrink-0 rounded-xl sm:size-20" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="type-page-title">{property.name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <MetaBadge meta={LISTING_STATUS[property.status]} />
              <span className="text-sm text-muted-foreground">
                {PROPERTY_TYPES[property.type].label}, {places.municipalityName(property.address.municipalityId)}
              </span>
            </div>
          </div>
        </div>

        {/* The next step sits up top so it's in reach on a phone, above a long list of units. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {(live || property.status === "pending-review") && (
            <Button variant="outline" asChild>
              <Link to={PATHS.listing(property.id)}>
                <ExternalLink aria-hidden="true" />
                View public listing
              </Link>
            </Button>
          )}
          {live && (
            <Button disabled={confirm.isPending} onClick={() => confirm.mutate(property.id, { onSuccess: () => toast.success("Availability confirmed") })}>
              <CalendarCheck aria-hidden="true" />
              Confirm availability
            </Button>
          )}
          {canSubmit && (
            <Button
              disabled={submit.isPending || property.units.length === 0}
              onClick={() => submit.mutate(property.id, { onSuccess: () => toast.success("Submitted for review", { description: "We'll email you when it's live." }) })}
            >
              <Send aria-hidden="true" />
              Submit for review
            </Button>
          )}
        </div>
      </header>
      {canSubmit && property.units.length === 0 && <p className="text-meta text-muted-foreground lg:text-right">Add at least one unit before submitting.</p>}

      {property.moderationNote && (
        <Alert>
          <AlertDescription>
            <span className="font-medium text-foreground">Note from the Abong team: </span>
            {property.moderationNote}
          </AlertDescription>
        </Alert>
      )}

      <LineTabs
        label="Property sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "units", label: "Units", count: property.units.length },
          { value: "details", label: "Property details" },
        ]}
      />

      {tab === "details" ? (
        <PropertyForm
          key={property.updatedAt}
          property={property}
          submitLabel="Save changes"
          onSubmit={async (draft) => {
            try {
              const saved = await propertiesService.update(landlordId, property.id, draft)
              await invalidate()
              toast.success("Changes saved", {
                description: live && saved.status === "pending-review" ? "The address changed, so your listing is back in review and hidden from search until it's approved." : undefined,
              })
            } catch {
              toast.error("Couldn't save your changes. Try again.")
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            {rentals.isPending ? <Skeleton className="h-40 rounded-xl" /> : <PropertyRenters property={property} rentals={rentals.data ?? []} />}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <UnitsManager propertyId={property.id} units={property.units} live={live} />
            </div>
          </div>

          <aside className="divide-y divide-border rounded-xl border border-border bg-card xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
            <section className="space-y-4 p-5" aria-labelledby="status-title">
              <h2 id="status-title" className="type-card-title">
                Listing status
              </h2>
              <p className="text-sm text-muted-foreground">{STATUS_HELP[property.status]}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Views</dt>
                  <dd className="font-semibold tabular">{formatNumber(property.views)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Inquiries</dt>
                  <dd className="font-semibold tabular">{property.inquiryCount}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Availability confirmed</dt>
                  <dd className="font-semibold">{formatRelative(property.availabilityConfirmedAt)}</dd>
                </div>
              </dl>
              {property.status !== "suspended" && (
                <Button
                  variant="ghost"
                  className="-ml-2 text-muted-foreground"
                  disabled={archive.isPending}
                  onClick={() =>
                    archive.mutate(
                      { pid: property.id, archived: property.status !== "archived" },
                      { onSuccess: () => toast.success(property.status === "archived" ? "Restored as draft" : "Property archived") },
                    )
                  }
                >
                  <Archive aria-hidden="true" />
                  {property.status === "archived" ? "Restore as draft" : "Archive property"}
                </Button>
              )}
            </section>
            <section className="space-y-3 p-5" aria-labelledby="pv-title">
              <div className="flex items-center justify-between gap-3">
                <h2 id="pv-title" className="type-card-title">
                  Property verification
                </h2>
                <MetaBadge meta={VERIFICATION_STATUS[property.propertyVerification]} />
              </div>
              <p className="text-sm text-muted-foreground">Proof that you own or manage this property. Required for the Verified badge.</p>
              {property.propertyVerification !== "verified" && property.propertyVerification !== "pending" && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${PATHS.landlord.verification}?property=${property.id}`}>Verify this property</Link>
                </Button>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

export { PropertyDetailPage as Component }
