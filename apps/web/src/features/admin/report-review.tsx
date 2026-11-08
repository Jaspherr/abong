import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { MetaBadge } from "@/components/common/status-badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { DECISION_NOTE_MIN, LISTING_STATUS, REPORT_REASONS, REPORT_STATUS } from "@/constants/status"
import { formatDate, formatRelative } from "@/lib/format"
import { adminService, type ReportWithContext } from "@/services"
import type { ReportStatus } from "@/types"
import { decisionError } from "./decision-error"
import { DecisionHistory } from "./decision-history"
import { isOpenReport } from "./report-status"
import { DecisionBar, FactList } from "./review-split"

/**
 * `related` holds the other reports on the same listing, so repeated concerns and
 * duplicates are seen together and can be closed with the same finding.
 */
export function ReportReview({
  report,
  related,
  onClosed,
  onOpenRelated,
}: {
  report: ReportWithContext
  related: ReportWithContext[]
  onClosed: () => void
  onOpenRelated: (id: string) => void
}) {
  const client = useQueryClient()
  const [note, setNote] = useState("")
  const [noteError, setNoteError] = useState(false)
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["admin"] }), client.invalidateQueries({ queryKey: ["listings"] })])
  const update = useMutation({
    mutationFn: (status: ReportStatus) => adminService.updateReport(report.id, status, note.trim() || undefined),
    onSuccess: async (r) => {
      await refresh()
      toast.success(`Report ${REPORT_STATUS[r.status].label.toLowerCase()}`)
      if (!isOpenReport(r.status)) onClosed()
    },
    onError: (error) => toast.error(decisionError(error)),
  })
  /** Closing a report needs a finding, so the outcome still makes sense later. */
  const close = (status: Extract<ReportStatus, "resolved" | "dismissed">) => {
    if (note.trim().length < DECISION_NOTE_MIN) return setNoteError(true)
    update.mutate(status)
  }
  const suspend = useMutation({
    mutationFn: async () => {
      await adminService.moderate(report.listingId, "suspend", `Suspended while investigating report: ${REPORT_REASONS[report.reason].label}`)
      // A report already under investigation stays there; only an open one moves on.
      if (report.status === "open") await adminService.updateReport(report.id, "investigating")
    },
    onSuccess: async () => {
      await refresh()
      toast.success("Listing suspended while you investigate")
    },
    onError: async (error) => {
      // The listing may have been suspended even if the report update failed.
      await refresh()
      toast.error(decisionError(error))
    },
  })
  const open = isOpenReport(report.status)

  return (
    <>
      <div className="space-y-6 p-4 sm:p-5">
        <header className="space-y-1">
          <h2 className="type-subsection">{REPORT_REASONS[report.reason].label}</h2>
          <p className="text-meta text-muted-foreground">
            On {report.listingName}, filed {formatDate(report.createdAt)}
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <MetaBadge meta={REPORT_STATUS[report.status]} />
            <MetaBadge meta={{ ...LISTING_STATUS[report.listingStatus], label: `Listing ${LISTING_STATUS[report.listingStatus].label.toLowerCase()}` }} />
          </div>
        </header>

        <blockquote className="rounded-lg bg-muted p-4 text-body">“{report.details}”</blockquote>

        <FactList>
          <dt>Reporter</dt>
          <dd>{report.reporterName}</dd>
          <dt>Landlord</dt>
          <dd>{report.landlordName}</dd>
          <dt>Listing</dt>
          <dd>
            <Link to={`${PATHS.admin.listings}?review=${report.listingId}`} className="font-medium text-primary underline-offset-4 underline decoration-transparent transition-colors hover:decoration-current">
              Open in moderation
            </Link>
          </dd>
        </FactList>

        {report.resolutionNote && <p className="rounded-lg bg-success-soft p-3 text-sm text-success">Resolution: {report.resolutionNote}</p>}

        {related.length > 0 && (
          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="font-sans text-sm font-semibold">Other reports on this listing ({related.length})</h3>
            <ul className="divide-y divide-border">
              {related.map((other) => (
                <li key={other.id} className="py-2.5 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => onOpenRelated(other.id)}
                    className="group block w-full rounded-sm text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium transition-colors group-hover:text-primary">{REPORT_REASONS[other.reason].label}</span>
                      <MetaBadge meta={REPORT_STATUS[other.status]} />
                    </span>
                    <span className="mt-0.5 block text-meta text-muted-foreground">
                      {other.reporterName}, {formatRelative(other.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <DecisionHistory targetIds={[report.id]} />

        {open && report.reason === "scam-concern" && report.listingStatus === "active" && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-soft p-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1 space-y-2 text-sm">
              <p>Possible scam on a live listing. Suspend it while you investigate to protect renters.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={suspend.isPending}>
                    Suspend listing
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend {report.listingName}?</AlertDialogTitle>
                    <AlertDialogDescription>It will be hidden from search right away, and this report moves to investigating.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it live</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => suspend.mutate()}>
                      Suspend listing
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>

      {open && (
        <DecisionBar>
          <div className="space-y-1.5">
            <Label htmlFor="report-note" className="flex-wrap">
              Resolution note
              <span className="font-normal text-muted-foreground">Required to resolve or dismiss</span>
            </Label>
            <Textarea
              id="report-note"
              rows={2}
              className="min-h-16"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteError(false)
              }}
              aria-invalid={noteError}
              aria-describedby={noteError ? "report-note-error" : undefined}
              placeholder="What did you find and what was done?"
            />
            {noteError && (
              <p id="report-note-error" className="text-meta text-destructive">
                Add a note of at least 10 characters saying what you found.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {report.status === "open" && (
              <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate("investigating")}>
                Start investigating
              </Button>
            )}
            <Button variant="outline" disabled={update.isPending} onClick={() => close("dismissed")}>
              Dismiss
            </Button>
            <Button disabled={update.isPending} onClick={() => close("resolved")}>
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mark resolved
            </Button>
          </div>
        </DecisionBar>
      )}
    </>
  )
}
