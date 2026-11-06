import { useMutation } from "@tanstack/react-query"
import { Flag, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { REPORT_REASONS } from "@/constants/status"
import { useAuth } from "@/features/auth/auth-context"
import { reportsService } from "@/services"
import type { ReportReason } from "@/types"

export function ReportListingDialog({ listingId, listingName }: { listingId: string; listingName: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | "">("")
  const [details, setDetails] = useState("")
  const [attempted, setAttempted] = useState(false)
  const needsDetails = reason === "other" && details.trim().length < 10

  const submit = useMutation({
    mutationFn: () =>
      reportsService.create({ listingId, reporterId: user?.id ?? null, reason: reason as ReportReason, details: details.trim() }),
    onSuccess: () => {
      setOpen(false)
      setReason("")
      setDetails("")
      setAttempted(false)
      toast.success("Report sent", { description: "Our team reviews reports within 24 hours. Thank you for keeping renters safe." })
    },
    onError: () => toast.error("The report didn't send. Try again."),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag aria-hidden="true" />
          Report listing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report {listingName}</DialogTitle>
          <DialogDescription>Reports are confidential. The landlord won't see who reported the listing.</DialogDescription>
        </DialogHeader>
        <form
          id="report-form"
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setAttempted(true)
            if (reason && !needsDetails) submit.mutate()
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">What's wrong?</legend>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="gap-1" aria-invalid={attempted && !reason}>
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((key) => (
                <Label
                  key={key}
                  htmlFor={`reason-${key}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 font-normal transition-colors hover:bg-muted has-data-[state=checked]:bg-secondary"
                >
                  <RadioGroupItem id={`reason-${key}`} value={key} className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{REPORT_REASONS[key].label}</span>
                    <span className="text-xs text-muted-foreground">{REPORT_REASONS[key].hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            {attempted && !reason && <p className="text-xs text-destructive">Choose the reason that fits best.</p>}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">
              Details {reason !== "other" && <span className="font-normal text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={800}
              aria-invalid={attempted && needsDetails}
              placeholder="What happened? Include dates or amounts if money was requested."
            />
            {attempted && needsDetails && <p className="text-xs text-destructive">Tell us briefly what happened.</p>}
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="report-form" variant="destructive" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
