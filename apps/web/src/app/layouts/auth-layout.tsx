import { BadgeCheck, CalendarCheck, MessageSquare } from "lucide-react"
import { Suspense } from "react"
import { Outlet } from "react-router"
import { Logo } from "@/components/common/logo"
import { Photo } from "@/components/common/photo"
import { PageLoader } from "@/components/feedback/skeletons"

const POINTS = [
  { icon: BadgeCheck, text: "Verified landlords and properties are clearly marked" },
  { icon: MessageSquare, text: "Ask questions before you visit, all in one inbox" },
  { icon: CalendarCheck, text: "Request viewings without paying anything upfront" },
]

/** Photo backdrop with the page's card centered on top, followed by the brand promise. */
export function AuthLayout() {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-ink">
      <div className="fixed inset-0 -z-10 bg-ink" aria-hidden="true">
        <Photo src="/photos/living-08.webp" alt="" className="absolute inset-0 bg-ink opacity-45" priority />
        <div className="absolute inset-0 bg-linear-to-b from-ink/40 via-ink/60 to-ink" />
      </div>

      <header className="flex justify-center px-4 pt-8 pb-6 sm:pt-10">
        <Logo tone="inverse" />
      </header>

      {/* Below xl: card, then headline, then points. From xl: headline | card | points, the card staying centered. */}
      <main
        id="main"
        className="flex flex-1 flex-col items-center gap-6 px-4 pb-12 sm:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_30rem_minmax(0,1fr)] xl:content-center xl:items-center xl:gap-14 xl:px-12"
      >
        <div className="w-full max-w-120 rounded-xl border border-border bg-card p-5 shadow-raised sm:p-8 xl:col-start-2 xl:row-start-1">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>

        <p
          className="mt-6 max-w-120 text-center type-page-title text-balance text-white xl:col-start-1 xl:row-start-1 xl:mt-0 xl:max-w-sm xl:self-center xl:justify-self-end xl:text-right xl:text-5xl xl:leading-[1.05]"
          aria-hidden="true"
        >
          A room near school. A home near work. Found in Pangasinan.
        </p>

        <ul className="w-fit space-y-3 xl:col-start-3 xl:row-start-1 xl:max-w-xs xl:self-center xl:justify-self-start xl:space-y-4" aria-hidden="true">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-white/80 sm:text-base">
              <Icon className="mt-0.5 size-5 shrink-0 text-white/70" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
