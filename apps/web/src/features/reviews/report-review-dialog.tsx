import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { REVIEW_REPORT_REASONS } from "@/constants/reviews"
import { reviewsService } from "@/services"
import type { ReviewReportReason } from "@/types"

/** Flags a review for an admin to check. Reporting never hides the review by itself. */
export function ReportReviewDialog({ reviewId, children }: { reviewId: string; children: ReactNode }) {
  const client = useQueryClient()
  const detailsId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReviewReportReason>()
  const [details, setDetails] = useState("")
  const [attempted, setAttempted] = useState(false)

  const submit = useMutation({
    mutationFn: () => reviewsService.report(reviewId, reason!, details),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["reviews"] })
      client.invalidateQueries({ queryKey: ["admin", "reviews"] })
      setOpen(false)
      toast.success("Review reported", { description: "Abong will check it against the review rules." })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't send the report."),
  })

  const needsDetails = reason === "other" && details.trim().length < 10

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setReason(undefined)
          setDetails("")
          setAttempted(false)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>
            The review stays up while Abong checks it. Honest negative reviews aren't removed.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setAttempted(true)
            if (reason && !needsDetails) submit.mutate()
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">What's wrong?</legend>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReviewReportReason)} className="gap-1" aria-invalid={attempted && !reason}>
              {(Object.keys(REVIEW_REPORT_REASONS) as ReviewReportReason[]).map((key) => (
                <Label
                  key={key}
                  htmlFor={`review-report-${key}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 font-normal transition-colors hover:bg-muted has-data-[state=checked]:bg-secondary"
                >
                  <RadioGroupItem id={`review-report-${key}`} value={key} className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{REVIEW_REPORT_REASONS[key].label}</span>
                    <span className="text-xs text-muted-foreground">{REVIEW_REPORT_REASONS[key].hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            {attempted && !reason && <p className="text-xs text-destructive">Choose the reason that fits best.</p>}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor={detailsId}>
              Details {reason !== "other" && <span className="font-normal text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id={detailsId}
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              aria-invalid={attempted && needsDetails}
              rows={3}
            />
            {attempted && needsDetails && <p className="text-xs text-destructive">Tell us what's wrong (at least 10 characters).</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
