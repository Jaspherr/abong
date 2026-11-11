import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { qk } from "@/lib/query"
import { rentalsService } from "@/services"

const WHOLE = "whole"

/**
 * Records a stay for the other side to confirm. Renters pick from properties of landlords who've
 * replied to them; landlords pick from renters they've replied to. Nothing counts until confirmed.
 * `defaultListingId` preselects the place when it's opened from that property's page.
 */
export function ProposeRentalDialog({ children, defaultListingId = "" }: { children: ReactNode; defaultListingId?: string }) {
  const { user } = useAuth()
  const client = useQueryClient()
  const ids = { renter: useId(), property: useId(), unit: useId(), date: useId() }
  const isLandlord = user!.role === "landlord"
  const [open, setOpen] = useState(false)
  const [renterId, setRenterId] = useState("")
  const [listingId, setListingId] = useState("")
  const [unitId, setUnitId] = useState(WHOLE)
  const [startDate, setStartDate] = useState("")
  const [attempted, setAttempted] = useState(false)
  const [serverError, setServerError] = useState<string>()

  const options = useQuery({
    queryKey: qk.rentalOptions(user!.id),
    queryFn: rentalsService.proposalOptions,
    enabled: open,
  })
  const property = options.data?.properties.find((p) => p.listingId === listingId)

  const errors = {
    renter: isLandlord && !renterId ? "Choose the renter." : undefined,
    property: !listingId ? "Choose the place." : undefined,
    date: !startDate ? "Enter the move-in date." : undefined,
  }
  const show = (e?: string) => (attempted ? e : undefined)

  const submit = useMutation({
    mutationFn: () =>
      rentalsService.propose({
        listingId,
        unitId: unitId === WHOLE ? undefined : unitId,
        startDate,
        renterId: isLandlord ? renterId : undefined,
      }),
    onSuccess: (rental) => {
      client.invalidateQueries({ queryKey: ["rentals"] })
      setOpen(false)
      toast.success("Stay recorded", {
        description: `${isLandlord ? rental.renter.name : rental.landlord.name} will be asked to confirm it.`,
      })
    },
    onError: (e) => setServerError(e instanceof Error ? e.message : "Couldn't record the stay."),
  })

  const nothingToPick = options.data && (isLandlord ? !options.data.renters.length || !options.data.properties.length : !options.data.properties.length)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setRenterId("")
          setListingId(defaultListingId)
          setUnitId(WHOLE)
          setStartDate("")
          setAttempted(false)
          setServerError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLandlord ? "Record a renter" : "Add a place you live"}</DialogTitle>
          <DialogDescription>
            {isLandlord
              ? "The renter confirms it before it counts. No contract, ID or payment details needed."
              : "Your landlord confirms it before it counts. No contract, ID or payment details needed."}
          </DialogDescription>
        </DialogHeader>

        {options.isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        ) : options.isError ? (
          <p className="text-meta text-destructive">Couldn't load your options. Close this and try again.</p>
        ) : nothingToPick ? (
          <p className="text-body text-muted-foreground">
            {isLandlord
              ? "You can record a renter once you've replied to their inquiry or confirmed their viewing."
              : "You can add a place once its landlord has replied to your inquiry or confirmed your viewing."}
          </p>
        ) : (
          <form
            id="propose-rental"
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setAttempted(true)
              setServerError(undefined)
              if (!errors.renter && !errors.property && !errors.date) submit.mutate()
            }}
          >
            {isLandlord && (
              <div className="space-y-1.5">
                <Label htmlFor={ids.renter}>Renter</Label>
                <Select value={renterId} onValueChange={setRenterId}>
                  <SelectTrigger id={ids.renter} className="w-full" aria-invalid={!!show(errors.renter)}>
                    <SelectValue placeholder="Choose a renter" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data.renters.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-caption text-muted-foreground">Renters you've replied to or confirmed a viewing with.</p>
                {show(errors.renter) && <p className="text-meta text-destructive">{errors.renter}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={ids.property}>Place</Label>
              <Select
                value={listingId}
                onValueChange={(v) => {
                  setListingId(v)
                  setUnitId(WHOLE)
                }}
              >
                <SelectTrigger id={ids.property} className="w-full" aria-invalid={!!show(errors.property)}>
                  <SelectValue placeholder="Choose a place" />
                </SelectTrigger>
                <SelectContent>
                  {options.data.properties.map((p) => (
                    <SelectItem key={p.listingId} value={p.listingId}>
                      {isLandlord ? p.name : `${p.name}, ${p.landlordName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {show(errors.property) && <p className="text-meta text-destructive">{errors.property}</p>}
            </div>
            {property && property.units.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor={ids.unit}>
                  Room or unit <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger id={ids.unit} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WHOLE}>Not sure, or the whole place</SelectItem>
                    {property.units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={ids.date}>Move-in date</Label>
              <Input
                id={ids.date}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={!!show(errors.date)}
              />
              <p className="text-caption text-muted-foreground">Up to two years back, or six months ahead.</p>
              {show(errors.date) && <p className="text-meta text-destructive">{errors.date}</p>}
            </div>
            {serverError && (
              <p role="alert" className="text-meta text-destructive">
                {serverError}
              </p>
            )}
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {nothingToPick ? "Close" : "Cancel"}
          </Button>
          {!nothingToPick && options.data && (
            <Button type="submit" form="propose-rental" disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Send for confirmation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
