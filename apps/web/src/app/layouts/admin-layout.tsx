import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  ExternalLink,
  History,
  Flag,
  Gauge,
  LayoutList,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { Suspense } from "react"
import { Link, NavLink, Outlet } from "react-router"
import { PageLoader } from "@/components/feedback/skeletons"
import { SiteHeader } from "@/components/layout/site-header"
import { PATHS } from "@/constants/app"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { adminService } from "@/services"

type QueueKey = "listings" | "verifications" | "reports"

type RailItem = {
  to: string
  label: string
  icon: LucideIcon
  queue?: QueueKey
  end?: boolean
}

type RailGroup = {
  label?: string
  items: RailItem[]
}

const RAIL: RailGroup[] = [
  { items: [{ to: PATHS.admin.overview, label: "Overview", icon: Gauge, end: true }] },
  {
    label: "Review",
    items: [
      { to: PATHS.admin.listings, label: "Moderation", icon: LayoutList, queue: "listings" },
      { to: PATHS.admin.verifications, label: "Verifications", icon: ShieldCheck, queue: "verifications" },
      { to: PATHS.admin.reports, label: "Reports", icon: Flag, queue: "reports" },
    ],
  },
  {
    label: "People",
    items: [
      { to: PATHS.admin.users, label: "Users", icon: Users },
      { to: PATHS.admin.landlords, label: "Landlords", icon: UsersRound },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: PATHS.admin.analytics, label: "Analytics", icon: BarChart3 },
      { to: PATHS.admin.audit, label: "Audit log", icon: History },
    ],
  },
]

function RailLink({ item, count }: { item: RailItem; count?: number }) {
  const { to, label, icon: Icon, end } = item

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-meta outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
          isActive
            ? "bg-muted/65 font-semibold text-foreground"
            : "font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors motion-reduce:transition-none",
              isActive ? "bg-primary" : "bg-transparent",
            )}
          />
          <Icon
            className={cn(
              "size-4 shrink-0 transition-colors motion-reduce:transition-none",
              isActive ? "text-primary" : "text-muted-foreground/75 transition-colors group-hover:text-foreground",
            )}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">
            {label}
            {count !== undefined && count > 0 && <span className="sr-only">, {count} to review</span>}
          </span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-caption font-semibold leading-none tabular-nums",
                isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground transition-colors group-hover:text-foreground",
              )}
              aria-hidden="true"
            >
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

/**
 * A slim, task-first Admin rail. The shared SiteHeader owns navigation at
 * smaller widths, so this sidebar intentionally appears from lg upward only.
 */
export function AdminLayout() {
  const { data } = useQuery({ queryKey: qk.admin.overview, queryFn: adminService.getOverview })

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader accountLinks={false} />

      <div className="container-page min-w-0 flex-1 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8 xl:gap-11">
        <aside className="hidden border-r border-border/70 lg:block" aria-label="Administration sidebar">
          {/* Spacing tightens on short screens so the rail fits without its own scrollbar. */}
          <div className="sticky top-(--header-height) flex max-h-[calc(100svh-var(--header-height))] flex-col overflow-y-auto py-(--rail-gap) pr-4 [--rail-gap:clamp(0.75rem,7svh_-_2rem,2rem)]">

            <nav aria-label="Admin sections" className="space-y-[calc(var(--rail-gap)*0.75)]">
              {RAIL.map((group, index) => (
                <div key={group.label ?? `group-${index}`} className="space-y-1">
                  {group.label && (
                    <p className="mb-2 px-3 text-caption font-medium text-muted-foreground">{group.label}</p>
                  )}
                  {group.items.map((item) => (
                    <RailLink key={item.to} item={item} count={item.queue ? data?.queue[item.queue] : undefined} />
                  ))}
                </div>
              ))}
            </nav>

            <div className="mt-(--rail-gap) border-t border-border/70 pt-4">
              <Link
                to="/"
                className="group flex min-h-10 items-center gap-3 rounded-md px-3 text-meta font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <ExternalLink className="size-4 shrink-0 text-muted-foreground/75 transition-colors group-hover:text-foreground" strokeWidth={1.8} aria-hidden="true" />
                <span className="flex-1">View public site</span>
              </Link>
            </div>
          </div>
        </aside>

        <main id="main" className="min-w-0 pt-6 pb-10 sm:pt-8">
          {/* Admin pages load immediately; don't delay frequent route changes with page entrance motion. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
