import { Suspense } from "react"
import { Outlet } from "react-router"
import { PageLoader } from "@/components/feedback/skeletons"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export function PublicLayout({ footer = true }: { footer?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {footer && <SiteFooter />}
    </div>
  )
}
