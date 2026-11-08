import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { ErrorState } from "@/components/feedback/states"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import {
  DECISION_NOTE_MIN,
  LISTING_STATUS,
  MODERATION_ACTIONS,
  MODERATION_NEEDS_NOTE,
  REPORT_REASONS,
  REPORT_STATUS,
} from "@/constants/status"
import { fullAddress, typeLabel } from "@/features/listings/listing-utils"
import { formatMonths, formatPeso, formatRelative } from "@/lib/format"
import { qk } from "@/lib/query"
import { adminService } from "@/services"
import type { ListingStatus, ModerationAction } from "@/types"
import { decisionError } from "./decision-error"
import { DecisionHistory } from "./decision-history"
import { DecisionBar, FactList } from "./review-split"
import { VerificationChecks } from "./verification-checks"

const ACTION_LABEL: Record<ModerationAction, string> = {
  approve: "Approve",
  "request-changes": "Request changes",
  reject: "Reject",
  suspend: "Suspend",
  archive: "Archive",
}

const ACTION_TOAST: Record<ModerationAction, string> = {
  approve: "Listing approved and live",
  "request-changes": "Sent back to landlord for changes",
  reject: "Listing rejected",
  suspend: "Listing suspended",
  archive: "Listing archived",
}

const NO_ACTIONS_HELP: Partial<Record<ListingStatus, string>> = {
  draft: "The landlord hasn't submitted this listing yet, so there's nothing to decide.",
  archived: "This listing was archived. The landlord can restore it as a draft and resubmit.",
}

export function ListingReview({ listingId, onDecided }: { listingId: string; onDecided: () => void }) {
  const client = useQueryClient()
  const [note, setNote] = useState("")
  const [noteError, setNoteError] = useState(false)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin.review(listingId),
    queryFn: () => adminService.getListingForReview(listingId),
  })

  const moderate = useMutation({
    mutationFn: (action: ModerationAction) => adminService.moderate(listingId, action, note.trim() || undefined),
    onSuccess: async (_status, action) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["listings"] }),
        client.invalidateQueries({ queryKey: ["properties"] }),
        client.invalidateQueries({ queryKey: ["places"] }),
      ])
      toast.success(ACTION_TOAST[action])
      setNote("")
      onDecided()
    },
    onError: (error) => toast.error(decisionError(error)),
  })

  const run = (action: ModerationAction) => {
    if (MODERATION_NEEDS_NOTE.includes(action) && note.trim().length < DECISION_NOTE_MIN) {
      setNoteError(true)
      return
    }
    moderate.mutate(action)
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (isPending) return <Skeleton className="m-4 h-96" />

  const { listing, reports, landlordHidden } = data
  const actions = MODERATION_ACTIONS[listing.status]

  return (
    <>
      <div className="space-y-6 p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="type-subsection">{listing.name}</h2>
            <p className="text-meta text-muted-foreground">
              {typeLabel(listing)} by {listing.landlord.displayName}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <MetaBadge meta={LISTING_STATUS[listing.status]} />
              <span className="text-caption text-muted-foreground">Updated {formatRelative(listing.updatedAt)}</span>
            </div>
          </div>
          {/* Only these two statuses have a public page; the others would open "not available". */}
          {(listing.status === "active" || listing.status === "pending-review") && !landlordHidden && (
            <Button variant="outline" size="sm" asChild>
              <Link to={PATHS.listing(listing.id)} target="_blank">
                <ExternalLink aria-hidden="true" />
                Open listing
              </Link>
            </Button>
          )}
        </header>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:-mx-5 sm:px-5">
          {listing.photos.map((p) => (
            <Photo key={p.id} src={p.src} alt={p.alt} className="aspect-[4/3] w-52 shrink-0 rounded-lg" />
          ))}
        </div>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-sans text-sm font-semibold">Submitted details</h3>
          <FactList>
            <dt>Address</dt>
            <dd>{fullAddress(listing)}</dd>
            <dt>Rent</dt>
            <dd className="tabular">
              {formatPeso(listing.priceFrom)}
              {listing.priceTo > listing.priceFrom && ` – ${formatPeso(listing.priceTo)}`}
            </dd>
            <dt>Advance / deposit</dt>
            <dd>
              {formatMonths(listing.terms.advanceMonths)} / {formatMonths(listing.terms.depositMonths)}
            </dd>
            <dt>Units</dt>
            <dd>{listing.units.map((u) => u.name).join(", ") || "None"}</dd>
          </FactList>
          <p className="max-w-prose text-sm leading-relaxed">{listing.description}</p>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-sans text-sm font-semibold">Landlord verification</h3>
          <VerificationChecks verifications={listing.landlord.verifications} />
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-sans text-sm font-semibold">Reports ({reports.length})</h3>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports on this listing.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                  <div className="mb-0.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{REPORT_REASONS[r.reason].label}</span>
                    <MetaBadge meta={REPORT_STATUS[r.status]} />
                  </div>
                  <p className="text-muted-foreground">{r.details}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {landlordHidden && (
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            Hidden from renters because the landlord's account is suspended. It comes back when the account is reactivated.
          </p>
        )}

        {listing.moderationNote && (
          <section className="space-y-1 border-t border-border pt-5">
            <h3 className="font-sans text-sm font-semibold">Last note to landlord</h3>
            <p className="text-sm text-muted-foreground">{listing.moderationNote}</p>
          </section>
        )}

        <DecisionHistory targetIds={[listing.id]} />

        {NO_ACTIONS_HELP[listing.status] && <p className="border-t border-border pt-5 text-sm text-muted-foreground">{NO_ACTIONS_HELP[listing.status]}</p>}
      </div>

      {actions.length > 0 && (
        <DecisionBar>
          <div className="space-y-1.5">
            <Label htmlFor="moderation-note" className="flex-wrap">
              Note to landlord
              <span className="font-normal text-muted-foreground">Required to reject, suspend or request changes</span>
            </Label>
            <Textarea
              id="moderation-note"
              rows={2}
              className="min-h-16"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteError(false)
              }}
              aria-invalid={noteError}
              aria-describedby={noteError ? "moderation-note-help" : undefined}
              placeholder="e.g. “Photos don't match the address. Please upload photos of the actual rooms.”"
            />
            {noteError && (
              <p id="moderation-note-help" className="text-meta text-destructive">
                Add a note of at least 10 characters so the landlord knows what to fix.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action) =>
              action === "archive" ? (
                <AlertDialog key={action}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={moderate.isPending}>
                      Archive
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive {listing.name}?</AlertDialogTitle>
                      <AlertDialogDescription>It will be hidden from search. The landlord can restore it as a draft and resubmit.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep listing</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => run("archive")}>
                        Archive listing
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  key={action}
                  variant={action === "approve" ? "default" : action === "request-changes" ? "outline" : "destructive"}
                  disabled={moderate.isPending}
                  onClick={() => run(action)}
                >
                  {moderate.isPending && moderate.variables === action && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {ACTION_LABEL[action]}
                </Button>
              ),
            )}
          </div>
        </DecisionBar>
      )}
    </>
  )
}
