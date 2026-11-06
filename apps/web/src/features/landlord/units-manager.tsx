import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/feedback/states"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ARRANGEMENTS, UNIT_STATUSES } from "@/constants/listing"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { propertiesService } from "@/services"
import type { RentalUnit, UnitStatus } from "@/types"
import { OccupancyBar } from "./occupancy-bar"
import { usePropertyAction } from "./queries"
import { UnitFormDialog } from "./unit-form-dialog"

const STATUS_DOT: Record<UnitStatus, string> = {
  available: "bg-success",
  occupied: "bg-muted-foreground/50",
  reserved: "bg-warning",
  maintenance: "bg-destructive",
}

export function UnitsManager({ propertyId, units, live }: { propertyId: string; units: RentalUnit[]; live?: boolean }) {
  const setStatus = usePropertyAction((landlordId, a: { unitId: string; status: UnitStatus }) =>
    propertiesService.setUnitStatus(landlordId, propertyId, a.unitId, a.status),
  )
  const remove = usePropertyAction((landlordId, unitId: string) => propertiesService.deleteUnit(landlordId, propertyId, unitId))

  if (!units.length) {
    return (
      <EmptyState
        compact
        icon={BedDouble}
        title="No units yet"
        description="Add each room, bedspace set or unit you rent out. Renters see price and availability per unit."
        action={
          <UnitFormDialog propertyId={propertyId} live={live}>
            <Button>
              <Plus aria-hidden="true" />
              Add first unit
            </Button>
          </UnitFormDialog>
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-card-title">Rooms and units</h2>
          <p className="text-meta text-muted-foreground">
            {units.filter((u) => u.status === "available").length} of {units.length} open to renters
          </p>
        </div>
        <UnitFormDialog propertyId={propertyId} live={live}>
          <Button variant="outline">
            <Plus aria-hidden="true" />
            Add unit
          </Button>
        </UnitFormDialog>
      </div>
      <ul className="divide-y divide-border">
        {units.map((unit) => (
          <li key={unit.id} className="grid grid-cols-1 gap-3 py-4 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_10rem_auto]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                <span className={cn("size-2 rounded-full", STATUS_DOT[unit.status])} aria-hidden="true" />
                {unit.name}
              </p>
              <p className="text-meta text-muted-foreground">
                {ARRANGEMENTS[unit.arrangement]}
                {unit.privateCr ? ", private CR" : ""}
                {unit.aircon ? ", aircon" : ""}
              </p>
            </div>
            <div className="space-y-1.5 sm:order-3 lg:order-none">
              <p className="text-sm tabular">
                <span className="font-semibold">{formatPeso(unit.monthlyRent)}</span>
                <span className="text-muted-foreground">{unit.pricing === "per-bed" ? " / person" : " / month"}</span>
              </p>
              <OccupancyBar occupied={unit.occupiedBeds} capacity={unit.capacity} />
            </div>
            <Select
              value={unit.status}
              onValueChange={(status) =>
                setStatus.mutate(
                  { unitId: unit.id, status: status as UnitStatus },
                  { onSuccess: () => toast.success(`${unit.name} marked ${UNIT_STATUSES[status as UnitStatus].toLowerCase()}`) },
                )
              }
            >
              <SelectTrigger size="sm" className="w-full sm:w-40" aria-label={`Status of ${unit.name}`}>
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
            <div className="flex gap-1 sm:justify-end">
              <UnitFormDialog propertyId={propertyId} live={live} unit={unit}>
                <Button variant="ghost" size="icon" aria-label={`Edit ${unit.name}`}>
                  <Pencil aria-hidden="true" />
                </Button>
              </UnitFormDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${unit.name}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {unit.name}?</AlertDialogTitle>
                    <AlertDialogDescription>It will disappear from your listing. Existing inquiries about it stay in your inbox.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep unit</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => remove.mutate(unit.id, { onSuccess: () => toast.success(`${unit.name} deleted`) })}
                    >
                      Delete unit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
