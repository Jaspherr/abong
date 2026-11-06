import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { MetaBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import { formatDate } from "@/lib/format"
import { verificationService, type VerificationQueueItem } from "@/services"
import { DecisionBar, FactList } from "./review-split"

type Decision = "verified" | "needs-update" | "rejected"

export function VerificationReview({ item, onDecided }: { item: VerificationQueueItem; onDecided: () => void }) {
  const client = useQueryClient()
  const [note, setNote] = useState("")
  const [noteError, setNoteError] = useState(false)
  const review = useMutation({
    mutationFn: (decision: Decision) => verificationService.review(item.id, decision, note.trim() || undefined),
    onSuccess: async (_r, decision) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["verification"] }),
        client.invalidateQueries({ queryKey: ["listings"] }),
      ])
      toast.success(decision === "verified" ? "Marked as verified" : decision === "needs-update" ? "Asked landlord for an update" : "Verification rejected")
      setNote("")
      onDecided()
    },
    onError: () => toast.error("That didn't save. Try again."),
  })
  const decide = (d: Decision) => {
    if (d !== "verified" && note.trim().length < 10) return setNoteError(true)
    review.mutate(d)
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-5">
        <header className="space-y-1">
          <h2 className="type-subsection">
            {VERIFICATION_TYPES[item.type].label} check: {item.landlordName}
          </h2>
          <p className="text-meta text-muted-foreground">Submitted {formatDate(item.submittedAt, "MMM d, yyyy 'at' h:mm a")}</p>
        </header>

        <FactList>
          <dt>Landlord</dt>
          <dd>{item.landlordName}</dd>
          <dt>Email</dt>
          <dd className="truncate">{item.landlordEmail}</dd>
          {item.propertyName && (
            <>
              <dt>Property</dt>
              <dd>{item.propertyName}</dd>
            </>
          )}
          <dt>Status</dt>
          <dd>
            <MetaBadge meta={VERIFICATION_STATUS[item.status]} />
          </dd>
        </FactList>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-sans text-sm font-semibold">Documents</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {item.documents.map((d) => (
              <li key={d.label} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-center">
                <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">{d.label}</span>
                <span className="text-caption text-muted-foreground">Preview unavailable in demo build</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 border-t border-border pt-5 text-sm">
          <h3 className="font-sans font-semibold">Checklist</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {item.type === "identity" && (
              <>
                <li>Name on ID matches the account name</li>
                <li>Selfie matches the ID photo</li>
                <li>ID is not expired</li>
              </>
            )}
            {item.type === "property" && (
              <>
                <li>Name on document matches the landlord or a stated manager</li>
                <li>Address matches the listing's barangay and town</li>
                <li>Document is recent (within 12 months for bills)</li>
              </>
            )}
            {item.type === "contact" && <li>OTP confirmed on the registered mobile number</li>}
          </ul>
        </section>

        {item.reviewerNote && <p className="rounded-lg bg-info-soft p-3 text-sm text-info">Previous note: {item.reviewerNote}</p>}
      </div>

      {item.status === "pending" && (
        <DecisionBar>
          <div className="space-y-1.5">
            <Label htmlFor="verify-note">Note to landlord</Label>
            <Textarea
              id="verify-note"
              rows={2}
              className="min-h-16"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteError(false)
              }}
              aria-invalid={noteError}
              aria-describedby={noteError ? "verify-note-error" : undefined}
              placeholder="Required if you ask for an update or reject."
            />
            {noteError && (
              <p id="verify-note-error" className="text-meta text-destructive">
                Explain what's wrong so the landlord can fix it.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="destructive" disabled={review.isPending} onClick={() => decide("rejected")}>
              Reject
            </Button>
            <Button variant="outline" disabled={review.isPending} onClick={() => decide("needs-update")}>
              Request update
            </Button>
            <Button disabled={review.isPending} onClick={() => decide("verified")}>
              {review.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Approve
            </Button>
          </div>
        </DecisionBar>
      )}
    </>
  )
}
