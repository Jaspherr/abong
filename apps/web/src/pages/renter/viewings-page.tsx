
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorState } from "@/components/feedback/states"
import { Skeleton } from "@/components/ui/skeleton"

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
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { ViewingCard } from "@/features/viewings/viewing-card"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import {
  viewingsService,
  type ViewingWithContext,
} from "@/services"

type View = "upcoming" | "history"

const isUpcoming = (viewing: ViewingWithContext) =>
  viewing.status === "pending" ||
  viewing.status === "confirmed"

function RenterViewingsPage() {
  useDocumentTitle("Viewings")

  const { user } = useAuth()
  const userId = user!.id
  const client = useQueryClient()

  const [view, setView] = useState<View>("upcoming")

  const {
    data,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: qk.renterViewings(userId),
    queryFn: () => viewingsService.listForRenter(userId),
  })

  // ==========================================================
  // CANCEL VIEWING
  // ==========================================================

  const cancel = useMutation({
    mutationFn: (id: string) =>
      viewingsService.setStatus(id, "cancelled"),

    onSuccess: (viewing) => {
      void client.invalidateQueries({
        queryKey: ["viewings"],
      })

      toast.success("Viewing cancelled", {
        description: `${viewing.landlordName} has been notified.`,
      })
    },

    onError: () => {
      toast.error("Couldn't cancel the viewing. Please try again.")
    },
  })

  // ==========================================================
  // VIEWING DATA
  // ==========================================================

  const viewings = data ?? []

  const upcoming = viewings.filter(isUpcoming)

  const past = viewings
    .filter((viewing) => !isUpcoming(viewing))
    .reverse()

  const pendingCount = upcoming.filter(
    (viewing) => viewing.status === "pending",
  ).length

  const confirmedCount = upcoming.filter(
    (viewing) => viewing.status === "confirmed",
  ).length

  const displayed = view === "upcoming" ? upcoming : past

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-w-0 pb-12">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
      <header className="border-b border-border pb-8 sm:pb-10">

        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">

          {/* Title */}
          <div className="max-w-2xl">
            <h1 className="type-page-title text-foreground">
              Viewings<span className="text-primary">.</span>
            </h1>

            <p className="mt-3 max-w-lg text-body text-muted-foreground">
              Keep track of your viewing requests,
              upcoming visits, and previous appointments
              in one place.
            </p>
          </div>

          {/* Browse action */}
          <Link
            to={PATHS.favorites}
            className="group inline-flex w-fit shrink-0 items-center gap-2 border-b border-foreground/40 pb-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Your saved places

            <ArrowRight
              className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </Link>
        </div>
      </header>

      {/* =====================================================
          APPOINTMENT SUMMARY
      ===================================================== */}
      <div className="grid grid-cols-3 border-b border-border py-7 sm:py-9">

        {/* Upcoming */}
        <div className="min-w-0 pr-3 sm:pr-6">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="hidden size-4 text-primary sm:block"
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span className="text-caption font-medium text-muted-foreground sm:text-xs">
              Upcoming
            </span>
          </div>

          <p
            className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-4xl"
            aria-label={
              isPending
                ? "Loading upcoming viewings"
                : `${upcoming.length} upcoming viewings`
            }
          >
            {isPending ? "—" : upcoming.length}
          </p>
        </div>

        {/* Pending */}
        <div className="min-w-0 border-l border-border px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Clock3
              className="hidden size-4 text-warning sm:block"
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span className="text-caption font-medium text-muted-foreground sm:text-xs">
              Pending
            </span>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-4xl">
            {isPending ? "—" : pendingCount}
          </p>
        </div>

        {/* Confirmed */}
        <div className="min-w-0 border-l border-border pl-3 sm:pl-6">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="hidden size-4 text-success sm:block"
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span className="text-caption font-medium text-muted-foreground sm:text-xs">
              Confirmed
            </span>
          </div>

          <p className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-4xl">
            {isPending ? "—" : confirmedCount}
          </p>
        </div>
      </div>

      {/* =====================================================
          VIEW SWITCHER
      ===================================================== */}
      <div className="mt-8 flex flex-col gap-5 border-b border-border sm:flex-row sm:items-end sm:justify-between">

        <div
          role="group"
          aria-label="Viewing records"
          className="flex items-center gap-7 sm:gap-9"
        >
          <button
            type="button"
            aria-pressed={view === "upcoming"}
            onClick={() => setView("upcoming")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 pb-4",
              "text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              view === "upcoming"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Upcoming

            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-caption tabular-nums",
                view === "upcoming"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isPending ? "—" : upcoming.length}
            </span>
          </button>

          <button
            type="button"
            aria-pressed={view === "history"}
            onClick={() => setView("history")}
            className={cn(
              "relative flex items-center gap-2 border-b-2 pb-4",
              "text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              view === "history"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            History

            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-caption tabular-nums",
                view === "history"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isPending ? "—" : past.length}
            </span>
          </button>
        </div>

        <span className="hidden pb-4 text-xs text-muted-foreground sm:block">
          {view === "upcoming"
            ? "Your active viewing requests"
            : "Completed and closed requests"}
        </span>
      </div>

      {/* =====================================================
          VIEWING CONTENT
      ===================================================== */}
      <div className="pt-7 sm:pt-8">

        {/* LOADING */}
        {isPending ? (
          <div className="space-y-4" aria-label="Loading viewings">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="border-b border-border/70 pb-5"
              >
                <Skeleton className="h-28 w-full rounded-xl sm:h-32" />
              </div>
            ))}
          </div>

        ) : isError ? (

          /* ERROR */
          <ErrorState onRetry={() => refetch()} />

        ) : viewings.length === 0 ? (

          /* NO VIEWINGS */
          <div className="flex min-h-[22rem] flex-col items-center justify-center border border-dashed border-border bg-muted/20 px-6 py-12 text-center">

            <CalendarDays
              className="size-11 text-primary/65"
              strokeWidth={1.2}
              aria-hidden="true"
            />

            <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-foreground">
              No viewings scheduled yet.
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
              Found somewhere you'd like to see in person?
              Open a property's listing and request a viewing
              to choose a time.
            </p>

            <Button
              asChild
              size="lg"
              className="mt-7 h-11 gap-2 rounded-lg px-6"
            >
              <Link to={PATHS.favorites}>
                Explore saved places

                <ArrowRight
                  className="size-4"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>

        ) : displayed.length === 0 ? (

          /* NO RECORDS IN SELECTED VIEW */
          <div className="flex min-h-64 flex-col items-center justify-center border-b border-border px-6 py-12 text-center">

            {view === "upcoming" ? (
              <CalendarDays
                className="size-9 text-muted-foreground"
                strokeWidth={1.4}
                aria-hidden="true"
              />
            ) : (
              <History
                className="size-9 text-muted-foreground"
                strokeWidth={1.4}
                aria-hidden="true"
              />
            )}

            <h2 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
              {view === "upcoming"
                ? "Nothing coming up."
                : "No viewing history yet."}
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {view === "upcoming"
                ? "You don't have any pending or confirmed viewing requests right now."
                : "Previous and closed viewing requests will appear here."}
            </p>

            {view === "upcoming" && past.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => setView("history")}
                className="mt-6"
              >
                View history
              </Button>
            ) : view === "history" ? (
              <Button
                variant="outline"
                onClick={() => setView("upcoming")}
                className="mt-6"
              >
                Back to upcoming
              </Button>
            ) : (
              <Button asChild variant="outline" className="mt-6">
                <Link to={PATHS.favorites}>
                  Browse saved places
                </Link>
              </Button>
            )}
          </div>

        ) : (

          /* VIEWING RECORDS */
          <section
            aria-labelledby="viewings-list-title"
            className="space-y-5"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">

              <div>
                <p className="text-caption font-semibold text-primary">
                  {view === "upcoming"
                    ? "Your schedule"
                    : "Your records"}
                </p>

                <h2
                  id="viewings-list-title"
                  className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                >
                  {view === "upcoming"
                    ? "Upcoming viewings"
                    : "Viewing history"}
                </h2>
              </div>

              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {displayed.length}{" "}
                {displayed.length === 1 ? "request" : "requests"}
              </span>
            </div>

            <ul className="space-y-4">
              {displayed.map((viewing) => (
                <li key={viewing.id} className="min-w-0">

                  <ViewingCard
                    viewing={viewing}
                    perspective="renter"
                    actions={
                      view === "upcoming" ? (
                        <>
                          {/* Message landlord */}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={PATHS.inquiries}>
                              Message
                            </Link>
                          </Button>

                          {/* Cancel viewing */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={cancel.isPending}
                                className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                              >
                                Cancel
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Cancel this viewing?
                                </AlertDialogTitle>

                                <AlertDialogDescription>
                                  {viewing.landlordName} will be
                                  notified. You can request a
                                  new time from the listing anytime.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Keep viewing
                                </AlertDialogCancel>

                                <AlertDialogAction
                                  variant="destructive"
                                  disabled={cancel.isPending}
                                  onClick={() =>
                                    cancel.mutate(viewing.id)
                                  }
                                >
                                  Cancel viewing
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* =====================================================
          FOOTER — VIEWING REMINDER
      ===================================================== */}
      {!isPending && !isError && viewings.length > 0 && (
        <div className="mt-12 flex flex-col gap-4 border-t border-border bg-muted/20 px-5 py-6 sm:flex-row sm:items-start sm:gap-5 sm:px-6">

          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
            <CalendarDays
              className="size-4"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Before your viewing
            </h3>

            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">
              Bring a valid ID, confirm the meeting details
              with the landlord, and take time to inspect the
              property before making any payment.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { RenterViewingsPage as Component }
