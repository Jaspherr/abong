import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addDays, format, parseISO, startOfToday } from "date-fns"
import { CalendarClock, Check, CheckCheck, Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTime } from "@/lib/format"
import { viewingsService, type ViewingWithContext } from "@/services"
import type { ViewingStatus } from "@/types"
import { TimeSlotPicker } from "./time-slot-picker"

function useViewingMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ViewingStatus; note?: string }) => viewingsService.setStatus(id, status, note),
    onSuccess: () => client.invalidateQueries({ queryKey: ["viewings"] }),
    onError: () => toast.error("That didn't save. Try again."),
  })
}

function DeclineDialog({ viewing }: { viewing: ViewingWithContext }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const mutation = useViewingMutation()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <X aria-hidden="true" />
          Decline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline {viewing.renter.name}'s request?</DialogTitle>
          <DialogDescription>A short reason helps the renter pick another time or place.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`decline-${viewing.id}`}>Message to renter</Label>
          <Textarea id={`decline-${viewing.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sorry, the room was just reserved." />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep request
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { id: viewing.id, status: "declined", note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    setOpen(false)
                    toast("Request declined", { description: `${viewing.renter.name} has been notified.` })
                  },
                },
              )
            }
          >
            Decline request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RescheduleDialog({ viewing }: { viewing: ViewingWithContext }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(parseISO(viewing.date))
  const [time, setTime] = useState<string | undefined>(viewing.time)
  const [note, setNote] = useState("")
  const mutation = useMutation({
    mutationFn: () => viewingsService.reschedule(viewing.id, format(date!, "yyyy-MM-dd"), time!, note.trim() || undefined),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["viewings"] })
      setOpen(false)
      toast.success("New time sent", { description: `${format(date!, "EEE, MMM d")} at ${formatTime(time!)}` })
    },
    onError: () => toast.error("That didn't save. Try again."),
  })
  const today = startOfToday()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock aria-hidden="true" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Suggest a new time</DialogTitle>
          <DialogDescription>
            {viewing.renter.name} asked for {format(parseISO(viewing.date), "EEE, MMM d")} at {formatTime(viewing.time)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={[{ before: addDays(today, 1) }, { after: addDays(today, 45) }]}
            className="rounded-xl border border-border bg-card [--cell-size:--spacing(9)]"
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Time</legend>
            <TimeSlotPicker value={time} onChange={setTime} name={`reschedule-${viewing.id}`} />
          </fieldset>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`resched-note-${viewing.id}`}>Note</Label>
          <Textarea id={`resched-note-${viewing.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Mornings are better for us that week." />
        </div>
        <DialogFooter>
          <Button disabled={!date || !time || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Send new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LandlordViewingActions({ viewing }: { viewing: ViewingWithContext }) {
  const mutation = useViewingMutation()
  if (viewing.status === "pending") {
    return (
      <>
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({ id: viewing.id, status: "confirmed" }, { onSuccess: () => toast.success(`Viewing confirmed with ${viewing.renter.name}`) })
          }
        >
          <Check aria-hidden="true" />
          Confirm
        </Button>
        <RescheduleDialog viewing={viewing} />
        <DeclineDialog viewing={viewing} />
      </>
    )
  }
  if (viewing.status === "confirmed") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ id: viewing.id, status: "completed" }, { onSuccess: () => toast.success("Marked as completed") })}
        >
          <CheckCheck aria-hidden="true" />
          Mark completed
        </Button>
        <RescheduleDialog viewing={viewing} />
      </>
    )
  }
  return null
}
