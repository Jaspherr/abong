import { Building2, Check, IdCard, Lock, Smartphone, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router"
import { PageHeader } from "@/components/common/page-header"
import { MetaBadge } from "@/components/common/status-badge"
import { ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { useLandlordProperties, useLandlordVerification } from "@/features/landlord/queries"
import { ContactDialog, IdentityDialog, PropertyDialog } from "@/features/verification/verification-dialogs"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { VerificationRequest, VerificationStatus, VerificationType } from "@/types"

const ICONS: Record<VerificationType, LucideIcon> = { identity: IdCard, contact: Smartphone, property: Building2 }
const ORDER: VerificationType[] = ["contact", "identity", "property"]

function actionLabel(status: VerificationStatus) {
  if (status === "rejected" || status === "needs-update") return "Resubmit"
  return "Start"
}

function VerificationPage() {
  useDocumentTitle("Verification")
  const [params] = useSearchParams()
  const { data, isPending, isError, refetch } = useLandlordVerification()
  const properties = useLandlordProperties()

  // Waits for properties too, so a ?property= link can open its dialog with that property chosen.
  if (isPending || properties.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const { statuses, requests } = data
  const done = ORDER.filter((t) => statuses[t] === "verified").length
  const latest = (type: VerificationType) => requests.find((r) => r.type === type)
  const unverifiedProperties = (properties.data ?? []).filter((p) => p.propertyVerification !== "verified" && p.propertyVerification !== "pending")
  const preselect = params.get("property") ?? undefined
  // The first step that still needs the landlord gets the primary button.
  const nextStep = ORDER.find((t) => statuses[t] !== "verified" && statuses[t] !== "pending")

  const triggerFor = (type: VerificationType, button: ReactNode) => {
    if (type === "identity") return <IdentityDialog>{button}</IdentityDialog>
    if (type === "contact") return <ContactDialog>{button}</ContactDialog>
    return (
      <PropertyDialog properties={unverifiedProperties} defaultPropertyId={preselect && unverifiedProperties.some((p) => p.id === preselect) ? preselect : undefined}>
        {button}
      </PropertyDialog>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-8">
      <PageHeader title="Verification" description="Identity and property checks earn the Verified badge on your listings. Renters, especially parents, look for it." />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
            <span className="font-semibold">
              {done} of {ORDER.length} checks complete
            </span>
            <span className="text-muted-foreground">{statuses.identity === "verified" && statuses.property === "verified" ? "Your listings can show the Verified badge" : "The badge needs identity and property"}</span>
          </div>
          <Progress value={(done / ORDER.length) * 100} aria-label="Verification progress" />
        </div>

        <ol className="divide-y divide-border">
          {ORDER.map((type, i) => {
            const status = statuses[type]
            const verified = status === "verified"
            const Icon = verified ? Check : ICONS[type]
            const req = latest(type)
            const canAct = !verified && status !== "pending"
            return (
              <li key={type} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", verified ? "bg-success-soft text-success" : "bg-secondary text-primary")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="type-card-title">
                      <span className="text-muted-foreground">{i + 1}. </span>
                      {VERIFICATION_TYPES[type].label}
                    </h2>
                    <MetaBadge meta={VERIFICATION_STATUS[status]} />
                  </div>
                  <p className="text-sm text-muted-foreground">{VERIFICATION_TYPES[type].description}</p>
                  {req?.reviewerNote && (status === "needs-update" || status === "rejected") && (
                    <p className="rounded-lg bg-info-soft px-3 py-2 text-sm text-info">Reviewer: {req.reviewerNote}</p>
                  )}
                  {status === "pending" && req && <p className="text-sm text-muted-foreground">Submitted {formatDate(req.submittedAt)}. In review.</p>}
                </div>
                {canAct && <div className="shrink-0">{triggerFor(type, <Button variant={type === nextStep ? "default" : "outline"}>{actionLabel(status)}</Button>)}</div>}
                {type === "property" && verified && unverifiedProperties.length > 0 && (
                  <div className="shrink-0">{triggerFor(type, <Button variant="outline">Verify another property</Button>)}</div>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Documents are used only for verification and are never shown to renters. In this demo build, files are not uploaded or stored.
      </p>

      {requests.length > 0 && (
        <section aria-labelledby="history-title" className="space-y-3">
          <h2 id="history-title" className="type-card-title">
            Submission history
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4 sm:px-5">
            {requests.map((r: VerificationRequest) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-sm">
                <span className="font-medium">{VERIFICATION_TYPES[r.type].label}</span>
                <span className="text-muted-foreground">{r.documents.map((d) => d.label).join(", ")}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-muted-foreground">{formatDate(r.submittedAt)}</span>
                  <MetaBadge meta={VERIFICATION_STATUS[r.status]} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export { VerificationPage as Component }
