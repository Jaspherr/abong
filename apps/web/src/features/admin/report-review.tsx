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
import { LISTING_STATUS, REPORT_REASONS, REPORT_STATUS } from "@/constants/status"
import { formatDate } from "@/lib/format"
import { adminService, type ReportWithContext } from "@/services"
import type { ReportStatus } from "@/types"
import { isOpenReport } from "./report-status"
import { DecisionBar, FactList } from "./review-split"

export function ReportReview({ report, onClosed }: { report: ReportWithContext; onClosed: () => void }) {
  const client = useQueryClient()
  const [note, setNote] = useState("")
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["admin"] }), client.invalidateQueries({ queryKey: ["listings"] })])
  const update = useMutation({
    mutationFn: (status: ReportStatus) => adminService.updateReport(report.id, status, note.trim() || undefined),
    onSuccess: async (r) => {
      await refresh()
      toast.success(`Report ${REPORT_STATUS[r.status].label.toLowerCase()}`)
      if (!isOpenReport(r.status)) onClosed()
    },
    onError: () => toast.error("That didn't save. Try again."),
  })
  const suspend = useMutation({
    mutationFn: async () => {
      await adminService.moderate(report.listingId, "suspend", `Suspended while investigating report: ${REPORT_REASONS[report.reason].label}`)
      return adminService.updateReport(report.id, "investigating")
    },
    onSuccess: async () => {
      await refresh()
      toast.success("Listing suspended while you investigate")
    },
    onError: () => toast.error("That didn't save. Try again."),
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
            <Label htmlFor="report-note">Resolution note</Label>
            <Textarea id="report-note" rows={2} className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you find and what was done?" />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {report.status === "open" && (
              <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate("investigating")}>
                Start investigating
              </Button>
            )}
            <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate("dismissed")}>
              Dismiss
            </Button>
            <Button disabled={update.isPending} onClick={() => update.mutate("resolved")}>
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mark resolved
            </Button>
          </div>
        </DecisionBar>
      )}
    </>
  )
}
