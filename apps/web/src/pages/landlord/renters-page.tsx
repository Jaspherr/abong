import { useQuery } from "@tanstack/react-query"
import { Plus, UsersRound } from "lucide-react"
import { PageHeader, SectionHeading } from "@/components/common/page-header"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { ProposeRentalDialog } from "@/features/rentals/propose-rental-dialog"
import { RentalActions } from "@/features/rentals/rental-actions"
import { RentalCard } from "@/features/rentals/rental-card"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { todayIso } from "@/lib/format"
import { qk } from "@/lib/query"
import { rentalsService, type RentalWithContext } from "@/services"

function Group({ id, title, description, rentals, today }: { id: string; title: string; description?: string; rentals: RentalWithContext[]; today: string }) {
  if (!rentals.length) return null
  return (
    <section aria-labelledby={id} className="space-y-4">
      <SectionHeading as="h2" titleId={id} title={title} description={description} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rentals.map((r) => (
          <RentalCard key={r.id} rental={r} actions={<RentalActions rental={r} today={today} />} />
        ))}
      </div>
    </section>
  )
}

/**
 * Who lives at the landlord's places, as confirmed by both sides. Separate from unit occupancy,
 * which landlords still set themselves on each property.
 */
function LandlordRentersPage() {
  useDocumentTitle("Renters")
  const { user } = useAuth()
  const today = todayIso()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: qk.myRentals(user!.id), queryFn: rentalsService.listMine })

  const all = data ?? []
  const toAnswer = all.filter((r) => r.awaitingMe)
  const current = all.filter((r) => r.phase === "current" || r.phase === "upcoming")
  const waiting = all.filter((r) => r.phase === "pending" && !r.awaitingMe)
  const rest = all.filter((r) => !toAnswer.includes(r) && !current.includes(r) && !waiting.includes(r))

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <PageHeader
        title="Renters"
        description="Stays you and your renters both confirmed. Renters can review a stay after 30 days or once they move out."
        actions={
          <ProposeRentalDialog>
            <Button>
              <Plus aria-hidden="true" />
              Record a renter
            </Button>
          </ProposeRentalDialog>
        }
      />
      {isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No renters recorded yet"
          description="Record a renter once you've replied to them or confirmed their viewing. They confirm it before it counts."
        />
      ) : (
        <>
          <Group id="answer" title="Needs your answer" description="Renters recorded these stays. Confirm only what's right." rentals={toAnswer} today={today} />
          <Group id="current" title="Living at your places" rentals={current} today={today} />
          <Group id="waiting" title="Waiting for the renter" rentals={waiting} today={today} />
          <Group id="past" title="Past and other stays" rentals={rest} today={today} />
        </>
      )}
      <p className="text-caption text-muted-foreground">
        Recording a stay doesn't change a unit's availability. Update occupancy on the property itself.
      </p>
    </div>
  )
}

export { LandlordRentersPage as Component }
