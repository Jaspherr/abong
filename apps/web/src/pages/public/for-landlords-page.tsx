import { ArrowUpRight, BadgeCheck, CalendarDays, LayoutGrid, MessageSquare } from "lucide-react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { useDocumentTitle } from "@/hooks/use-document-title"

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Every room and bedspace in one place",
    body: "Add a property once, then manage each room, bedspace or unit with its own price and availability. Mark a slot occupied and your listing updates instantly.",
  },
  {
    icon: MessageSquare,
    title: "Inquiries from serious renters",
    body: "Renters see your advance, deposit, curfew and house rules before they message, so the questions you get are from people who already fit.",
  },
  {
    icon: CalendarDays,
    title: "Viewings on your schedule",
    body: "Confirm, decline or suggest a new time for viewing requests. No more back-and-forth texts to set a time.",
  },
  {
    icon: BadgeCheck,
    title: "A verified badge renters look for",
    body: "Verify your identity and property once. Verified listings appear first and get a badge renters and parents trust.",
  },
] as const

/** A focused, public-facing invitation for landlords — not another admin dashboard. */
function ForLandlordsPage() {
  useDocumentTitle("List your property")

  return (
    <div className="overflow-x-clip">
      {/* The hero is intentionally centered and image-led, unlike the admin's dense editorial layouts. */}
      <section className="container-page pt-12 sm:pt-16 lg:pt-20" aria-labelledby="landlord-hero-title">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2.5 text-caption font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            For property owners
          </span>

          <h1
            id="landlord-hero-title"
            className="mt-6 max-w-[18ch] font-display text-[clamp(2.5rem,6.5vw,5.5rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-foreground"
          >
            Rent out rooms in Pangasinan without the guesswork.
          </h1>

          <p className="mt-6 max-w-[57ch] text-base leading-[1.8] text-muted-foreground sm:text-lg">
            Abong is free for landlords. List your boarding house, apartment or house, and reach students, workers and
            families looking for monthly rentals.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" asChild className="w-full px-6 sm:w-auto">
              <Link to={`${PATHS.register}?role=landlord`}>
                Create a landlord account
                <ArrowUpRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full px-6 sm:w-auto">
              <Link to={PATHS.landlord.dashboard}>Go to my dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-2xl bg-muted sm:mt-16 sm:rounded-[1.25rem] lg:mt-20">
          <Photo
            src="/photos/hall-01.webp"
            alt="Bright stairway inside a residential building"
            className="aspect-[5/4] w-full object-cover sm:aspect-[16/8] lg:aspect-[21/9]"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent sm:h-36" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7 lg:p-8">
            <p className="max-w-[22ch] text-sm font-medium leading-snug tracking-[-0.01em] sm:text-base">
              A simpler way to list and manage your rental.
            </p>
            <span className="hidden text-caption font-semibold text-white/80 sm:block">
              Pangasinan, Philippines
            </span>
          </div>
        </div>
      </section>

      {/* Four concise capabilities, separated by rules rather than cards or dashboard widgets. */}
      <section className="container-page py-16 sm:py-20 lg:py-24" aria-labelledby="features-title">
        <div className="mb-9 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="text-caption font-semibold text-muted-foreground">What you get</p>
            <h2
              id="features-title"
              className="mt-3 max-w-xl font-display text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.045em] text-foreground"
            >
              Less back-and-forth. More clarity.
            </h2>
          </div>
          <p className="max-w-[32ch] text-sm leading-relaxed text-muted-foreground sm:text-right">
            The essentials for listing a property and staying on top of interest.
          </p>
        </div>

        <ul className="grid grid-cols-1 border-t border-border/80 md:grid-cols-2 md:gap-x-12 lg:gap-x-20">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 border-b border-border/80 py-7 sm:gap-5 sm:py-9">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/65 text-foreground sm:size-11">
                <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="max-w-[23ch] text-lg font-semibold leading-snug tracking-[-0.025em] text-foreground sm:text-xl">
                  {title}
                </h3>
                <p className="mt-3 max-w-[49ch] text-sm leading-[1.8] text-muted-foreground sm:text-body">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border/80 bg-muted/25" aria-labelledby="landlord-cta-title">
        <div className="container-page flex flex-col items-start gap-7 py-12 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:py-16">
          <div className="min-w-0">
            <h2
              id="landlord-cta-title"
              className="font-display text-[clamp(1.65rem,3vw,2.6rem)] font-semibold leading-tight tracking-[-0.045em] text-foreground"
            >
              Ready to list your space?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Get started with a free landlord account on Abong.
            </p>
          </div>
          <Button size="lg" asChild className="w-full shrink-0 px-6 sm:w-auto">
            <Link to={`${PATHS.register}?role=landlord`}>
              Create a landlord account
              <ArrowUpRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

export { ForLandlordsPage as Component }
