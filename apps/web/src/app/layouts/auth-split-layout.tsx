import { BadgeCheck, CalendarCheck, MessageSquare } from "lucide-react"
import { Suspense } from "react"
import { Outlet, useLocation } from "react-router"
import { Logo } from "@/components/common/logo"
import { PageLoader } from "@/components/feedback/skeletons"

const POINTS = [
  { icon: BadgeCheck, text: "Verified landlords and properties are clearly marked" },
  { icon: MessageSquare, text: "Ask questions before you visit, all in one inbox" },
  { icon: CalendarCheck, text: "Request viewings without paying anything upfront" },
]

/**
 * Sign-in and register: a card that fits the screen, so the page itself never scrolls.
 * When the screen is too short for the form (small phones, an open keyboard, browser zoom),
 * only the form panel scrolls, so no field is ever out of reach.
 * The minimum height fits the longer form, so the card stays the same size moving between the two.
 */
export function AuthSplitLayout() {
  const { pathname } = useLocation()

  return (
    <main id="main" className="mx-auto flex h-svh w-full max-w-xl items-center overflow-hidden sm:p-4 lg:max-w-6xl">
      <div className="flex h-full w-full overflow-hidden bg-card sm:h-auto sm:max-h-full sm:min-h-[min(44rem,100%)] sm:rounded-2xl sm:border sm:border-border sm:shadow-raised">
        <aside className="relative hidden w-[42.5%] shrink-0 flex-col justify-between gap-6 overflow-hidden bg-primary p-8 text-primary-foreground lg:flex xl:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute top-20 -right-44 size-110 rounded-full border border-primary-foreground/15" />
          <div aria-hidden="true" className="pointer-events-none absolute top-40 -right-24 size-80 rounded-full border border-primary-foreground/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-36 size-100 rounded-full border border-primary-foreground/10" />

          {/* The ring keeps the green logo tile visible against this green panel. */}
          <Logo tone="inverse" className="relative z-10 self-start [&_svg]:rounded-lg [&_svg]:ring-1 [&_svg]:ring-primary-foreground/50" />

          <p className="relative z-10 space-y-1 type-page-title">
            <span className="block">A room near school.</span>
            <span className="block">A home near work.</span>
            <span className="block">Found in Pangasinan.</span>
          </p>

          <ul className="relative z-10 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-body text-primary-foreground/85">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary-foreground/70" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </aside>

        {/* Keyed so moving between sign-in and register starts at the top of the panel. */}
        {/* Relative so hidden form controls (Radix's native select) stay inside this scroll area. */}
        <div key={pathname} className="relative flex min-w-0 flex-1 overflow-y-auto p-4 tall:py-8 sm:px-8 lg:px-10 xl:px-12">

          <div className="my-auto w-full">
            <Logo className="mb-3 lg:hidden" />
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
