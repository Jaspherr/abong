import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Send } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { RenterGate } from "@/features/auth/renter-gate"
import { formatPeso } from "@/lib/format"
import { inquiriesService } from "@/services"
import type { Listing } from "@/types"

const STARTERS = [
  "Is this still available for next month?",
  "Can I visit this weekend?",
  "Are water and electricity included in the rent?",
  "Is there a curfew?",
]

const MIN_LENGTH = 10
const ANY_UNIT = "any"

export function InquiryDialog({ listing, unitId, children }: { listing: Listing; unitId?: string; children: ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const messageId = useId()
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState(unitId ?? ANY_UNIT)
  const [message, setMessage] = useState("")
  const [touched, setTouched] = useState(false)
  const tooShort = message.trim().length < MIN_LENGTH

  const send = useMutation({
    mutationFn: () =>
      inquiriesService.create({
        listingId: listing.id,
        unitId: unit === ANY_UNIT ? undefined : unit,
        renterId: user!.id,
        body: message.trim(),
      }),
    onSuccess: (thread) => {
      client.invalidateQueries({ queryKey: ["inquiries"] })
      setOpen(false)
      setMessage("")
      setTouched(false)
      toast.success(`Message sent to ${thread.landlord.name}`, {
        description: "You'll see their reply in your inquiries.",
        action: { label: "Open", onClick: () => navigate(`${PATHS.inquiries}?thread=${thread.id}`) },
      })
    },
    onError: () => toast.error("Your message didn't send. Check your connection and try again."),
  })

  const isRenter = user?.role === "renter"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setUnit(unitId ?? ANY_UNIT)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Message {listing.landlord.displayName}</DialogTitle>
          <DialogDescription>About {listing.name}. Asking questions is free and doesn't commit you to anything.</DialogDescription>
        </DialogHeader>

        {!isRenter ? (
          <RenterGate action="message landlords" />
        ) : (
          <form
            id="inquiry-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setTouched(true)
              if (!tooShort) send.mutate()
            }}
          >
            {listing.units.length > 1 && (
              <div className="grid gap-1.5">
                <Label htmlFor="inquiry-unit">Which room or unit?</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="inquiry-unit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_UNIT}>Not sure yet</SelectItem>
                    {listing.units.map((u) => (
                      <SelectItem key={u.id} value={u.id} disabled={u.status === "occupied"}>
                        {u.name}, {formatPeso(u.monthlyRent)}
                        {u.status === "occupied" ? " (occupied)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={messageId}>Your message</Label>
              <div className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMessage((m) => (m ? `${m.trim()} ${s}` : s))}
                    className="rounded-md border border-ink/15 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Textarea
                id={messageId}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => setTouched(true)}
                rows={5}
                maxLength={1000}
                placeholder="Introduce yourself and ask what you'd like to know: move-in date, who you'll live with, school or work."
                aria-invalid={touched && tooShort}
                aria-describedby={`${messageId}-hint`}
              />
              <p id={`${messageId}-hint`} className={touched && tooShort ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {touched && tooShort
                  ? `Write at least ${MIN_LENGTH} characters so the landlord knows what you need.`
                  : "Don't share bank or GCash details. Landlords never need them to answer questions."}
              </p>
            </div>
          </form>
        )}

        {isRenter && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="inquiry-form" disabled={send.isPending}>
              {send.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {send.isPending ? "Sending…" : "Send message"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
