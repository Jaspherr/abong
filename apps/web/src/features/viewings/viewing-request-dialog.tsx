import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addDays, format, startOfToday } from "date-fns"
import { CalendarCheck, Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { RenterGate } from "@/features/auth/renter-gate"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { viewingsService } from "@/services"
import type { Listing } from "@/types"
import { TimeSlotPicker } from "./time-slot-picker"

const ANY_UNIT = "any"

export function ViewingRequestDialog({ listing, children }: { listing: Listing; children: ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>()
  const [time, setTime] = useState<string | undefined>()
  const [unit, setUnit] = useState(ANY_UNIT)
  const [message, setMessage] = useState("")
  const [attempted, setAttempted] = useState(false)

  const request = useMutation({
    mutationFn: () =>
      viewingsService.request({
        listingId: listing.id,
        unitId: unit === ANY_UNIT ? undefined : unit,
        renterId: user!.id,
        date: format(date!, "yyyy-MM-dd"),
        time: time!,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["viewings"] })
      setOpen(false)
      toast.success("Viewing requested", {
        description: `${format(date!, "EEE, MMM d")} at ${formatTime(time!)}. ${listing.landlord.displayName} will confirm.`,
        action: { label: "View", onClick: () => navigate(PATHS.viewings) },
      })
      setDate(undefined)
      setTime(undefined)
      setMessage("")
      setAttempted(false)
    },
    onError: () => toast.error("The request didn't go through. Try again."),
  })

  const today = startOfToday()
  const isRenter = user?.role === "renter"
  const openUnits = listing.units.filter((u) => u.status !== "occupied")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Request a viewing</DialogTitle>
          <DialogDescription>
            Pick a time to see {listing.name} in person. The landlord confirms or suggests another time.
          </DialogDescription>
        </DialogHeader>

        {!isRenter ? (
          <RenterGate action="request viewings" />
        ) : (
          <form
            id="viewing-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              setAttempted(true)
              if (date && time) request.mutate()
            }}
          >
            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Date</legend>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={[{ before: addDays(today, 1) }, { after: addDays(today, 45) }]}
                  className={cn("rounded-xl border border-border bg-card [--cell-size:--spacing(9)]", attempted && !date && "border-destructive")}
                />
                {attempted && !date && <p className="text-xs text-destructive">Choose a date.</p>}
              </fieldset>
              <div className="space-y-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Time</legend>
                  <TimeSlotPicker value={time} onChange={setTime} invalid={attempted && !time} />
                  {attempted && !time && <p className="mt-1.5 text-xs text-destructive">Choose a time.</p>}
                </fieldset>
                {openUnits.length > 1 && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="viewing-unit">Room or unit to see</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger id="viewing-unit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY_UNIT}>Any available</SelectItem>
                        {openUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="viewing-message">
                Note for the landlord <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="viewing-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. I'll come with my parents. We're driving from Tarlac."
              />
            </div>
          </form>
        )}

        {isRenter && (
          <DialogFooter className="items-center">
            {date && time && (
              <p className="mr-auto text-sm text-muted-foreground">
                {format(date, "EEE, MMM d")} at {formatTime(time)}
              </p>
            )}
            <Button type="submit" form="viewing-form" disabled={request.isPending}>
              {request.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
              {request.isPending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
