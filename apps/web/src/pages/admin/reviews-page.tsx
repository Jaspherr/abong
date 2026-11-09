import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Flag, Loader2, ShieldCheck } from "lucide-react"
import { useId, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { LineTabs } from "@/components/common/line-tabs"
import { StatusBadge } from "@/components/common/status-badge"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { REVIEW_ASPECTS, REVIEW_KIND, REVIEW_REPORT_REASONS } from "@/constants/reviews"
import { DECISION_NOTE_MIN } from "@/constants/status"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { Stars } from "@/features/reviews/stars"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate, formatRelative, pluralize } from "@/lib/format"
import { qk } from "@/lib/query"
import { rentalsService, reviewsService } from "@/services"
import type { Review, ReviewAspect } from "@/types"

type Tab = "disputes" | "reported" | "removed"

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.")

/** A required note and the buttons that act on it. Nothing happens without a reason on record. */
function Decision({
  actions,
  pending,
}: {
  actions: { label: string; variant?: "default" | "outline" | "destructive"; run: (note: string) => Promise<unknown> }[]
  pending?: boolean
}) {
  const id = useId()
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<string>()
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <label htmlFor={id} className="text-meta font-semibold">
        Decision note
      </label>
      <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!error} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className={error ? "text-meta text-destructive" : "text-caption text-muted-foreground"}>
        {error ?? `Why you decided this, at least ${DECISION_NOTE_MIN} characters. Kept in the audit log.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            size="sm"
            variant={a.variant ?? "default"}
            disabled={pending || !!busy}
            onClick={async () => {
              if (note.trim().length < DECISION_NOTE_MIN) return setError(`Add a note of at least ${DECISION_NOTE_MIN} characters.`)
              setError(undefined)
              setBusy(a.label)
              try {
                await a.run(note)
              } catch (e) {
                setError(errorText(e))
              } finally {
                setBusy(undefined)
              }
            }}
          >
            {busy === a.label && <Loader2 className="animate-spin" aria-hidden="true" />}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function ReviewBody({ review }: { review: Review & { authorName: string; landlordName: string } }) {
  const aspects = Object.entries(review.aspects) as [ReviewAspect, number][]
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars value={review.overall} />
        <StatusBadge tone="neutral" dot={false}>
          {REVIEW_KIND[review.kind].badge}
        </StatusBadge>
      </div>
      <p className="text-meta text-muted-foreground">
        {review.authorName} about{" "}
        <Link to={PATHS.listing(review.listingId)} className="font-medium text-foreground underline decoration-ink/25 underline-offset-4">
          {review.propertyName}
        </Link>{" "}
        ({review.landlordName}), {formatDate(review.createdAt, "MMMM d, yyyy")}
      </p>
      {review.body ? <p className="max-w-prose text-body whitespace-pre-line">{review.body}</p> : <p className="text-meta text-muted-foreground">Rating only, no text.</p>}
      {aspects.length > 0 && (
        <p className="text-meta text-muted-foreground">{aspects.map(([a, v]) => `${REVIEW_ASPECTS[a].label} ${v}/5`).join(", ")}</p>
      )}
      {review.response && (
        <p className="border-l-2 border-border pl-3 text-meta">
          <span className="font-semibold">Landlord reply: </span>
          {review.response.body}
        </p>
      )}
    </div>
  )
}

function useInvalidate() {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ["admin"] })
    client.invalidateQueries({ queryKey: ["reviews"] })
    client.invalidateQueries({ queryKey: ["rentals"] })
  }
}

function Disputes() {
  const invalidate = useInvalidate()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.admin.rentalDisputes, queryFn: rentalsService.listDisputes })
  const resolve = useMutation({
    mutationFn: (input: { id: string; outcome: "keep" | "void"; note: string }) => rentalsService.resolveDispute(input.id, input.outcome, input.note),
    onSuccess: (_, input) => {
      invalidate()
      toast.success(input.outcome === "keep" ? "Stay kept" : "Stay voided")
    },
  })
  if (isPending) return <Skeleton className="h-48 rounded-2xl" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data.length) return <EmptyState compact icon={ShieldCheck} title="No disputed stays" description="When a renter or landlord reports a problem with a stay, it shows up here." />
  return (
    <ul className="grid grid-cols-1 gap-4">
      {data.map((r) => (
        <li key={r.id} className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
          <div className="space-y-1">
            <p className="type-card-title break-words">
              {r.renter.name} at {r.propertyName}
              {r.unitName ? `, ${r.unitName}` : ""}
            </p>
            <p className="text-meta text-muted-foreground">
              Landlord {r.landlord.name}. Moved in {formatDate(r.startDate, "MMMM d, yyyy")}
              {r.endDate ? `, moved out ${formatDate(r.endDate, "MMMM d, yyyy")}` : ""}. Recorded by the{" "}
              {r.proposedBy}, confirmed {r.confirmedAt ? formatDate(r.confirmedAt, "MMMM d, yyyy") : "earlier"}.
            </p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-meta font-semibold">
              Reported by {r.openedByName}, {r.dispute ? formatRelative(r.dispute.openedAt) : ""}
            </p>
            <p className="mt-1 text-body whitespace-pre-line">{r.dispute?.reason}</p>
          </div>
          <p className="text-caption text-muted-foreground">
            {r.reviewCount ? `${pluralize(r.reviewCount, "review")} of this stay ${r.reviewCount === 1 ? "is" : "are"} on hold until you decide.` : "No review of this stay yet."}{" "}
            Ask both sides for what you need through support. Don't collect contracts or IDs unless there's no other way.
          </p>
          <Decision
            pending={resolve.isPending}
            actions={[
              { label: "Keep the stay", run: (note) => resolve.mutateAsync({ id: r.id, outcome: "keep", note }) },
              { label: "Void the stay", variant: "outline", run: (note) => resolve.mutateAsync({ id: r.id, outcome: "void", note }) },
            ]}
          />
        </li>
      ))}
    </ul>
  )
}

function Reported() {
  const invalidate = useInvalidate()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.admin.reportedReviews, queryFn: reviewsService.listReported })
  const decide = useMutation({
    mutationFn: (input: { id: string; action: "hide" | "keep"; note: string }) => reviewsService.decide(input.id, input.action, input.note),
    onSuccess: (_, input) => {
      invalidate()
      toast.success(input.action === "hide" ? "Review removed" : "Review kept")
    },
  })
  if (isPending) return <Skeleton className="h-48 rounded-2xl" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data.length) return <EmptyState compact icon={Flag} title="No reported reviews" description="Reviews flagged by renters or landlords show up here." />
  return (
    <ul className="grid grid-cols-1 gap-4">
      {data.map((review) => (
        <li key={review.id} className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
          <ReviewBody review={review} />
          <div className="space-y-2">
            <p className="text-meta font-semibold">{pluralize(review.reports.length, "report")}</p>
            <ul className="space-y-1.5">
              {review.reports.map((report) => (
                <li key={report.id} className="text-meta">
                  <span className="font-medium">{REVIEW_REPORT_REASONS[report.reason].label}</span>
                  <span className="text-muted-foreground">, from {report.reporterName}, {formatRelative(report.createdAt)}</span>
                  {report.details && <span className="block text-muted-foreground">{report.details}</span>}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-caption text-muted-foreground">
            Remove a review only if it breaks the rules: private details, harassment, or not a real stay or viewing. A negative
            opinion isn't a reason.
          </p>
          <Decision
            pending={decide.isPending}
            actions={[
              { label: "Keep the review", run: (note) => decide.mutateAsync({ id: review.id, action: "keep", note }) },
              { label: "Remove the review", variant: "outline", run: (note) => decide.mutateAsync({ id: review.id, action: "hide", note }) },
            ]}
          />
        </li>
      ))}
    </ul>
  )
}

function Removed() {
  const invalidate = useInvalidate()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.admin.hiddenReviews, queryFn: reviewsService.listHidden })
  const restore = useMutation({
    mutationFn: (input: { id: string; note: string }) => reviewsService.restore(input.id, input.note),
    onSuccess: () => {
      invalidate()
      toast.success("Review restored")
    },
  })
  if (isPending) return <Skeleton className="h-48 rounded-2xl" />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data.length) return <EmptyState compact icon={ShieldCheck} title="No removed reviews" description="Reviews you remove, or that belong to a voided stay, are listed here." />
  return (
    <ul className="grid grid-cols-1 gap-4">
      {data.map((review) => (
        <li key={review.id} className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
          <ReviewBody review={review} />
          <Decision pending={restore.isPending} actions={[{ label: "Restore the review", variant: "outline", run: (note) => restore.mutateAsync({ id: review.id, note }) }]} />
        </li>
      ))}
    </ul>
  )
}

/** Disputed stays and reported reviews. Every decision needs a note and goes to the audit log. */
function AdminReviewsPage() {
  useDocumentTitle("Reviews and stays")
  const [tab, setTab] = useState<Tab>("disputes")
  const disputes = useQuery({ queryKey: qk.admin.rentalDisputes, queryFn: rentalsService.listDisputes })
  const reported = useQuery({ queryKey: qk.admin.reportedReviews, queryFn: reviewsService.listReported })
  const waiting = (disputes.data?.length ?? 0) + (reported.data?.length ?? 0)

  return (
    <div className="w-full space-y-4 pb-10">
      <AdminPageHeader
        title="Reviews and stays"
        description="Settle disputed stays and check reported reviews. Decisions are recorded in the audit log."
        metric={<HeaderMetric loading={disputes.isPending || reported.isPending} value={String(waiting)} label="Waiting for a decision" />}
      />
      <LineTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "disputes", label: "Disputed stays", count: disputes.data?.length },
          { value: "reported", label: "Reported reviews", count: reported.data?.length },
          { value: "removed", label: "Removed reviews" },
        ]}
      />
      <div className="max-w-3xl pt-2">{tab === "disputes" ? <Disputes /> : tab === "reported" ? <Reported /> : <Removed />}</div>
    </div>
  )
}

export { AdminReviewsPage as Component }
