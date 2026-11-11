import { BadgeCheck, CalendarCheck, CheckCheck, ChevronRight, FilePen, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { Photo } from "@/components/common/photo"
import { MetaBadge } from "@/components/common/status-badge"
import { PersonAvatar } from "@/features/profile/person-avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PATHS } from "@/constants/app"
import { LISTING_STATUS } from "@/constants/status"
import { useAuth } from "@/features/auth/auth-context"
import { OccupancyBar } from "@/features/landlord/occupancy-bar"
import { useLandlordInquiries, useLandlordProperties, useLandlordRentals, useLandlordVerification, useLandlordViewings, usePropertyAction } from "@/features/landlord/queries"
import { isLivingThere, stayDates } from "@/features/rentals/rental-utils"
import { LandlordViewingActions } from "@/features/viewings/landlord-viewing-actions"
import { DateBlock } from "@/features/viewings/viewing-card"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { daysSince, formatDate, formatRelative, formatTime, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { propertiesService, type RentalWithContext } from "@/services"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Magandang umaga" : h < 18 ? "Magandang hapon" : "Magandang gabi"
}

function Fact({ to, value, label, detail, emphasis }: { to: string; value: number; label: string; detail: string; emphasis?: boolean }) {
  return (
    <Link to={to} className="group block min-w-0 rounded-lg px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex items-baseline gap-2">
        <span className={cn("font-display text-price tabular", emphasis && "text-primary")}>{value}</span>
        <span className="truncate text-sm font-medium underline-offset-4 underline decoration-transparent transition-colors group-hover:decoration-current">{label}</span>
      </span>
      <span className="block text-meta text-muted-foreground">{detail}</span>
    </Link>
  )
}

function SectionTitle({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 id={id} className="type-card-title">
        {title}
      </h2>
      {action}
    </div>
  )
}

/** One thing waiting on the landlord: what it is, then the action that deals with it. */
function TodoRow({ lead, title, detail, actions }: { lead: ReactNode; title: ReactNode; detail?: ReactNode; actions: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {lead}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {detail && <p className="line-clamp-2 text-meta text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    </li>
  )
}

/** Who lives at a property, as a short line under its occupancy. Says so when beds are taken but nobody is recorded. */
function RenterLine({ renters, taken }: { renters: RentalWithContext[]; taken: number }) {
  if (renters.length === 0) {
    return taken > 0 ? <p className="mt-1 text-meta text-muted-foreground">No renters recorded yet</p> : null
  }
  const [first, second] = renters.map((r) => r.renter.name)
  const names = renters.length === 1 ? first : renters.length === 2 ? `${first} and ${second}` : `${first}, ${second} and ${renters.length - 2} more`
  return (
    <div className="mt-1.5 flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-1" aria-hidden="true">
        {renters.slice(0, 3).map((r) => (
          <PersonAvatar key={r.id} userId={r.renter.id} name={r.renter.name} className="size-7 text-caption ring-2 ring-card" />
        ))}
      </span>
      <p className="line-clamp-2 min-w-0 text-meta text-muted-foreground">
        <span className="sr-only">Living here: </span>
        {names}
      </p>
    </div>
  )
}

const iconLead = (Icon: typeof BadgeCheck) => (
  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
    <Icon className="size-5" aria-hidden="true" />
  </span>
)

function LandlordDashboardPage() {
  useDocumentTitle("Dashboard")
  const { user } = useAuth()
  const properties = useLandlordProperties()
  const inquiries = useLandlordInquiries()
  const viewings = useLandlordViewings()
  const verification = useLandlordVerification()
  const rentals = useLandlordRentals()
  const confirm = usePropertyAction((lid, pid: string) => propertiesService.confirmAvailability(lid, pid))

  const all = properties.data ?? []
  const active = all.filter((p) => p.status === "active")
  const units = active.flatMap((p) => p.units)
  const available = units.filter((u) => u.status === "available").length
  const occupied = units.filter((u) => u.status === "occupied").length
  const threads = inquiries.data ?? []
  const unread = threads.filter((i) => i.unreadForLandlord > 0)
  const read = threads.filter((i) => i.unreadForLandlord === 0)
  const bySchedule = <T extends { date: string; time: string }>(a: T, b: T) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  const pending = (viewings.data ?? []).filter((v) => v.status === "pending").sort(bySchedule)
  const upcoming = (viewings.data ?? []).filter((v) => v.status === "confirmed").sort(bySchedule)
  const statuses = verification.data?.statuses
  const needsVerification = Boolean(statuses) && !Object.values(statuses ?? {}).every((s) => s === "verified")
  const stale = active.filter((p) => daysSince(p.availabilityConfirmedAt) > 14)
  const needsChanges = all.filter((p) => p.status === "rejected" || p.status === "suspended")
  const drafts = all.filter((p) => p.status === "draft")
  const stays = rentals.data ?? []
  const toAnswer = stays.filter((r) => r.awaitingMe)
  // Longest-staying first, so the names don't reshuffle as stays are added.
  const livingAt = (propertyId: string) =>
    stays.filter((r) => r.listingId === propertyId && isLivingThere(r)).sort((a, b) => a.startDate.localeCompare(b.startDate))

  const loading = properties.isPending || inquiries.isPending || viewings.isPending || rentals.isPending
  const todoCount = pending.length + unread.length + toAnswer.length + stale.length + needsChanges.length + drafts.length + (needsVerification ? 1 : 0)
  const summary = loading
    ? "Checking on your properties."
    : todoCount
      ? `${pluralize(todoCount, "thing")} need${todoCount === 1 ? "s" : ""} you across your properties.`
      : "You're all caught up. Nothing needs you right now."

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0]}`}
        description={summary}
      />

      <nav aria-label="Summary" className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 lg:grid-cols-4">
        <Fact to={PATHS.landlord.inquiries} value={unread.length} label="Unread inquiries" detail={unread.length ? "Waiting for your reply" : "All caught up"} emphasis={unread.length > 0} />
        <Fact to={PATHS.landlord.viewings} value={pending.length} label="Pending viewings" detail={pending.length ? "Confirm or suggest a time" : "Nothing to confirm"} emphasis={pending.length > 0} />
        <Fact to={PATHS.landlord.listings} value={active.length} label="Active listings" detail={`${all.length - active.length} not live`} />
        <Fact to={PATHS.landlord.properties} value={available} label="Units open" detail={units.length ? `${occupied} of ${units.length} occupied` : "No units yet"} />
      </nav>

      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="todo-title" className="space-y-3">
            <SectionTitle id="todo-title" title="Needs you" />
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : todoCount === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
                {iconLead(CheckCheck)}
                <p className="text-sm text-muted-foreground">New messages and viewing requests will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {pending.map((v) => (
                  <TodoRow
                    key={v.id}
                    lead={<DateBlock date={v.date} />}
                    title={`${v.renter.name} wants to visit`}
                    detail={`${formatTime(v.time)}, ${v.listing.name}${v.unitName ? `, ${v.unitName}` : ""}`}
                    actions={<LandlordViewingActions viewing={v} />}
                  />
                ))}
                {unread.map((t) => (
                  <TodoRow
                    key={t.id}
                    lead={<PersonAvatar userId={t.renter.id} name={t.renter.name} className="size-10" />}
                    title={`${t.renter.name} asked about ${t.listing.name}`}
                    detail={t.messages.at(-1)?.body}
                    actions={
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`${PATHS.landlord.inquiries}?thread=${t.id}`} aria-label={`Reply to ${t.renter.name}`}>
                          Reply
                        </Link>
                      </Button>
                    }
                  />
                ))}
                {toAnswer.map((r) => (
                  <TodoRow
                    key={r.id}
                    lead={<PersonAvatar userId={r.renter.id} name={r.renter.name} className="size-10" />}
                    title={`${r.renter.name} says they live at ${r.propertyName}`}
                    detail={`${r.unitName ? `${r.unitName}. ` : ""}${stayDates(r)}. Confirm it only if it's right.`}
                    actions={
                      <Button size="sm" variant="outline" asChild>
                        <Link to={PATHS.landlord.renters} aria-label={`Answer ${r.renter.name}'s stay`}>
                          Answer
                        </Link>
                      </Button>
                    }
                  />
                ))}
                {stale.map((p) => (
                  <TodoRow
                    key={p.id}
                    lead={iconLead(CalendarCheck)}
                    title={`Is ${p.name} still available?`}
                    detail={`Last confirmed ${formatRelative(p.availabilityConfirmedAt)}. Renters see a warning on listings that aren't reconfirmed.`}
                    actions={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={confirm.isPending}
                        aria-label={`Confirm availability for ${p.name}`}
                        onClick={() => confirm.mutate(p.id, { onSuccess: () => toast.success(`Availability confirmed for ${p.name}`) })}
                      >
                        Confirm availability
                      </Button>
                    }
                  />
                ))}
                {needsChanges.map((p) => (
                  <TodoRow
                    key={p.id}
                    lead={<Photo src={p.photos[0]?.src} alt="" className="size-10 shrink-0 rounded-lg" />}
                    title={`${p.name} isn't live`}
                    detail={LISTING_STATUS[p.status].label}
                    actions={
                      <Button size="sm" variant="outline" asChild>
                        <Link to={PATHS.landlord.property(p.id)} aria-label={`Review ${p.name}`}>
                          Review
                        </Link>
                      </Button>
                    }
                  />
                ))}
                {drafts.map((p) => (
                  <TodoRow
                    key={p.id}
                    lead={iconLead(FilePen)}
                    title={`Finish ${p.name}`}
                    detail="Still a draft. Only you can see it until you submit it for review."
                    actions={
                      <Button size="sm" variant="outline" asChild>
                        <Link to={PATHS.landlord.property(p.id)} aria-label={`Continue ${p.name}`}>
                          Continue
                        </Link>
                      </Button>
                    }
                  />
                ))}
                {needsVerification && (
                  <TodoRow
                    lead={iconLead(BadgeCheck)}
                    title="Finish verification to get the Verified badge"
                    detail="Verified listings rank higher in search and get more inquiries from parents and students."
                    actions={
                      <Button size="sm" variant="outline" asChild>
                        <Link to={PATHS.landlord.verification}>Continue</Link>
                      </Button>
                    }
                  />
                )}
              </ul>
            )}
          </section>

          <section aria-labelledby="props-title" className="space-y-3">
            <SectionTitle
              id="props-title"
              title="Your properties"
              action={
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={PATHS.landlord.properties}>Manage</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={PATHS.landlord.newProperty}>
                      <Plus aria-hidden="true" />
                      Add property
                    </Link>
                  </Button>
                </div>
              }
            />
            {properties.isPending || rentals.isPending ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : all.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Properties you add will show up here.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {all.map((p) => {
                  const beds = p.units.reduce((s, u) => s + u.capacity, 0)
                  const taken = p.units.reduce((s, u) => s + u.occupiedBeds, 0)
                  return (
                    <li key={p.id}>
                      <Link to={PATHS.landlord.property(p.id)} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
                        <Photo src={p.photos[0]?.src} alt="" className="size-12 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate font-medium transition-colors group-hover:text-primary">{p.name}</span>
                            <MetaBadge meta={LISTING_STATUS[p.status]} />
                          </p>
                          {beds > 0 ? <OccupancyBar occupied={taken} capacity={beds} className="mt-1" /> : <p className="text-meta text-muted-foreground">No units yet</p>}
                          <RenterLine renters={livingAt(p.id)} taken={taken} />
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-7">
          <section aria-labelledby="viewings-title" className="space-y-3">
            <SectionTitle
              id="viewings-title"
              title="Coming up"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to={PATHS.landlord.viewings}>All requests</Link>
                </Button>
              }
            />
            {viewings.isPending ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No viewings scheduled.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {upcoming.slice(0, 4).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <DateBlock date={v.date} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.renter.name}</p>
                      <p className="text-meta text-muted-foreground">
                        {formatDate(v.date, "EEEE")}, {formatTime(v.time)}
                      </p>
                      <p className="truncate text-meta text-muted-foreground">{v.listing.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="messages-title" className="space-y-3">
            <SectionTitle
              id="messages-title"
              title="Recent messages"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to={PATHS.landlord.inquiries}>Inbox</Link>
                </Button>
              }
            />
            {inquiries.isPending ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : read.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">{threads.length ? "Every conversation is listed under Needs you." : "No messages yet."}</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {read.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link to={`${PATHS.landlord.inquiries}?thread=${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                      <PersonAvatar userId={t.renter.id} name={t.renter.name} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{t.renter.name}</span>
                          <span className="shrink-0 text-caption text-muted-foreground">{formatRelative(t.updatedAt)}</span>
                        </p>
                        <p className="truncate text-meta text-muted-foreground">{t.messages.at(-1)?.body}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export { LandlordDashboardPage as Component }
