import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, MessageSquare } from "lucide-react"
import { useId, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { ReviewDialog } from "@/features/reviews/review-dialog"
import { formatDate } from "@/lib/format"
import { DISPUTE_REASON_MIN, rentalsService, type RentalWithContext } from "@/services"

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.")

function useRentalMutation<T>(fn: (input: T) => Promise<unknown>, success: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["rentals"] })
      client.invalidateQueries({ queryKey: ["reviews"] })
      client.invalidateQueries({ queryKey: ["photos"] })
      toast.success(success)
    },
    onError: (e) => toast.error(errorText(e)),
  })
}

function EndStayDialog({ rental, today }: { rental: RentalWithContext; today: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string>()
  const end = useRentalMutation((d: string) => rentalsService.end(rental.id, d), "Move-out recorded")
  return (
    <Dialog open={open} onOpenChange={(next) => (setOpen(next), next && (setDate(today), setError(undefined)))}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Record move-out
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record a move-out</DialogTitle>
          <DialogDescription>
            The stay moves to history. {rental.side === "renter" ? "Your landlord" : "The renter"} is told and can report it if
            the date is wrong.
          </DialogDescription>
        </DialogHeader>
        <form
          id={`${id}-form`}
          noValidate
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!date) return setError("Enter the move-out date.")
            if (date < rental.startDate) return setError("The move-out date can't be before the move-in date.")
            if (date > today) return setError("The move-out date can't be in the future.")
            end.mutate(date, { onSuccess: () => setOpen(false), onError: (err) => setError(errorText(err)) })
          }}
        >
          <Label htmlFor={id}>Move-out date</Label>
          <Input id={id} type="date" value={date} min={rental.startDate} max={today} onChange={(e) => setDate(e.target.value)} aria-invalid={!!error} />
          <p className="text-caption text-muted-foreground">Moved in {formatDate(rental.startDate, "MMMM d, yyyy")}.</p>
          {error && <p className="text-meta text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} disabled={end.isPending}>
            {end.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Record move-out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisputeDialog({ rental }: { rental: RentalWithContext }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  const dispute = useRentalMutation((r: string) => rentalsService.dispute(rental.id, r), "Problem reported")
  return (
    <Dialog open={open} onOpenChange={(next) => (setOpen(next), next && (setReason(""), setError(undefined)))}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem with this stay</DialogTitle>
          <DialogDescription>
            For a stay that didn't happen, or wrong dates. An Abong admin reviews it, and any review of the stay is hidden
            until then. Don't include ID numbers or contracts.
          </DialogDescription>
        </DialogHeader>
        <form
          id={`${id}-form`}
          noValidate
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (reason.trim().length < DISPUTE_REASON_MIN) return setError(`Tell us what's wrong (at least ${DISPUTE_REASON_MIN} characters).`)
            dispute.mutate(reason, { onSuccess: () => setOpen(false), onError: (err) => setError(errorText(err)) })
          }}
        >
          <Label htmlFor={id}>What's wrong?</Label>
          <Textarea id={id} rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!error} />
          {error && <p className="text-meta text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} disabled={dispute.isPending}>
            {dispute.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Send to Abong
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What the viewer can do with a stay right now. Only actions that will succeed are shown. */
export function RentalActions({ rental, today }: { rental: RentalWithContext; today: string }) {
  const answer = useRentalMutation((accept: boolean) => rentalsService.answer(rental.id, accept), "Answer saved")
  const cancel = useRentalMutation(() => rentalsService.cancel(rental.id), "Stay withdrawn")
  const other = rental.side === "renter" ? rental.landlord.name : rental.renter.name
  const threadPath = rental.inquiryId
    ? `${rental.side === "renter" ? PATHS.inquiries : PATHS.landlord.inquiries}?thread=${rental.inquiryId}`
    : undefined
  const review = rental.review

  return (
    <>
      {rental.awaitingMe && (
        <>
          <Button size="sm" disabled={answer.isPending} onClick={() => answer.mutate(true)}>
            Confirm stay
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={answer.isPending}>
                Not right
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Decline this stay?</AlertDialogTitle>
                <AlertDialogDescription>
                  {other} recorded a stay at {rental.propertyName}. Declining means it won't be recorded. They can record it again
                  with the right details.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={() => answer.mutate(false)}>Decline</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {rental.phase === "pending" && !rental.awaitingMe && (
        <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(undefined)}>
          Withdraw
        </Button>
      )}

      {review?.state === "eligible" && (
        <ReviewDialog
          target={{ mode: "create", kind: "residence", sourceId: rental.id, propertyName: rental.propertyName, landlordName: rental.landlord.name }}
        >
          <Button size="sm">Review your stay</Button>
        </ReviewDialog>
      )}

      {threadPath && (
        <Button size="sm" variant="outline" asChild>
          <Link to={threadPath}>
            <MessageSquare aria-hidden="true" />
            Message
          </Link>
        </Button>
      )}

      {rental.status === "confirmed" && rental.startDate <= today && <EndStayDialog rental={rental} today={today} />}
      {(rental.status === "confirmed" || rental.status === "ended") && <DisputeDialog rental={rental} />}

      {review?.state === "not-yet" && (
        <p className="basis-full text-caption text-muted-foreground">You can review this stay from {formatDate(review.from, "MMMM d, yyyy")}.</p>
      )}
      {review?.state === "reviewed" && <p className="basis-full text-caption text-muted-foreground">You reviewed this stay.</p>}
    </>
  )
}
