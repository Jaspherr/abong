import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UNIT_STATUSES } from "@/constants/listing"
import { useFormState } from "@/hooks/use-form-state"
import { propertiesService } from "@/services"
import type { PricingBasis, RentalUnit, RoomArrangement, UnitStatus } from "@/types"
import { usePropertyAction } from "./queries"

interface Values extends Record<string, unknown> {
  name: string
  arrangement: RoomArrangement
  pricing: PricingBasis
  monthlyRent: string
  capacity: string
  occupiedBeds: string
  floorAreaSqm: string
  privateCr: boolean
  aircon: boolean
  furnished: boolean
  status: UnitStatus
  availableFrom: string
}

const validate = (v: Values) => {
  const e: Partial<Record<keyof Values, string>> = {}
  if (!v.name.trim()) e.name = "Name the unit, e.g. “Room 101”."
  const rent = Number(v.monthlyRent)
  if (!rent || rent < 500) e.monthlyRent = "Enter the monthly rent (₱500 or more)."
  const cap = Number(v.capacity)
  if (!cap || cap < 1 || cap > 20) e.capacity = "Between 1 and 20."
  const occ = Number(v.occupiedBeds || 0)
  if (occ > cap) e.occupiedBeds = "Can't exceed capacity."
  else if (v.status === "available" && v.pricing === "per-bed" && occ >= cap) e.occupiedBeds = "Every bed is taken. Lower this, or mark the unit occupied."
  return e
}

/** Today in the person's own timezone; the UTC date is still yesterday before 8 AM in the Philippines. */
const today = () => format(new Date(), "yyyy-MM-dd")

function toValues(unit?: RentalUnit): Values {
  return {
    name: unit?.name ?? "",
    arrangement: unit?.arrangement ?? "private",
    pricing: unit?.pricing ?? "per-unit",
    monthlyRent: unit ? String(unit.monthlyRent) : "",
    capacity: String(unit?.capacity ?? 1),
    occupiedBeds: String(unit?.occupiedBeds ?? 0),
    floorAreaSqm: unit?.floorAreaSqm ? String(unit.floorAreaSqm) : "",
    privateCr: unit?.privateCr ?? false,
    aircon: unit?.aircon ?? false,
    furnished: unit?.furnished ?? false,
    status: unit?.status ?? "available",
    availableFrom: unit?.availableFrom ?? today(),
  }
}

export function UnitFormDialog({ propertyId, unit, live, children }: { propertyId: string; unit?: RentalUnit; live?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const form = useFormState<Values>(toValues(unit), validate)
  const { values, set, blur, errorFor } = form
  const save = usePropertyAction((landlordId, v: Values) =>
    propertiesService.saveUnit(
      landlordId,
      propertyId,
      {
        name: v.name.trim(),
        arrangement: v.arrangement,
        pricing: v.pricing,
        monthlyRent: Number(v.monthlyRent),
        capacity: Number(v.capacity),
        occupiedBeds: Number(v.occupiedBeds || 0),
        floorAreaSqm: v.floorAreaSqm ? Number(v.floorAreaSqm) : undefined,
        privateCr: v.privateCr,
        aircon: v.aircon,
        furnished: v.furnished,
        status: v.status,
        availableFrom: v.availableFrom,
      },
      unit?.id,
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) form.reset(toValues(unit))
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{unit ? `Edit ${unit.name}` : "Add a unit"}</DialogTitle>
          <DialogDescription>A unit is anything you rent separately: a room, a set of bedspaces, a studio or a whole house.</DialogDescription>
        </DialogHeader>
        <form
          id="unit-form"
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.attempt()) return
            save.mutate(values, {
              onSuccess: ({ backInReview }) => {
                setOpen(false)
                toast.success(unit ? `${values.name} updated` : `${values.name} added`, {
                  description: backInReview ? "Your listing is back in review and hidden from search until it's approved." : undefined,
                })
              },
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Unit name" required error={errorFor("name")}>
              <Input value={values.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} placeholder="Room 101" />
            </FormField>
            <FormField label="Room type">
              <Select value={values.arrangement} onValueChange={(v) => set("arrangement", v as RoomArrangement)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private room or unit</SelectItem>
                  <SelectItem value="shared">Shared room</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Rent is charged">
              <Select value={values.pricing} onValueChange={(v) => set("pricing", v as PricingBasis)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-unit">Per unit, monthly</SelectItem>
                  <SelectItem value="per-bed">Per person (bedspace)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={values.pricing === "per-bed" ? "Rent per person" : "Monthly rent"} required error={errorFor("monthlyRent")} hint={live ? (unit ? "Changing the rent sends your live listing back for review." : "Adding a unit sends your live listing back for review.") : undefined}>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                <Input inputMode="numeric" className="pl-7 tabular" value={values.monthlyRent} onChange={(e) => set("monthlyRent", e.target.value.replace(/\D/g, ""))} onBlur={() => blur("monthlyRent")} />
              </div>
            </FormField>
            <FormField label={values.pricing === "per-bed" ? "Beds" : "Max occupants"} required error={errorFor("capacity")}>
              <Input inputMode="numeric" value={values.capacity} onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))} onBlur={() => blur("capacity")} />
            </FormField>
            <FormField label={values.pricing === "per-bed" ? "Beds taken" : "Current occupants"} error={errorFor("occupiedBeds")}>
              <Input inputMode="numeric" value={values.occupiedBeds} onChange={(e) => set("occupiedBeds", e.target.value.replace(/\D/g, ""))} />
            </FormField>
            <FormField label="Floor area" optional hint="square metres">
              <Input inputMode="numeric" value={values.floorAreaSqm} onChange={(e) => set("floorAreaSqm", e.target.value.replace(/\D/g, ""))} />
            </FormField>
            <FormField label="Status">
              <Select value={values.status} onValueChange={(v) => set("status", v as UnitStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIT_STATUSES) as UnitStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {UNIT_STATUSES[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {values.status === "available" && (
              <FormField label="Available from">
                <Input type="date" value={values.availableFrom} min={today()} onChange={(e) => set("availableFrom", e.target.value)} />
              </FormField>
            )}
          </div>
          <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
            <legend className="mb-2 text-sm font-medium">Inside the unit</legend>
            {(
              [
                ["privateCr", "Private CR"],
                ["aircon", "Air conditioning"],
                ["furnished", "Furnished"],
              ] as const
            ).map(([key, label]) => (
              <Label key={key} className="flex items-center gap-2.5 font-normal">
                <Checkbox checked={values[key]} onCheckedChange={(on) => set(key, on === true)} />
                {label}
              </Label>
            ))}
          </fieldset>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="unit-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {unit ? "Save changes" : "Add unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
