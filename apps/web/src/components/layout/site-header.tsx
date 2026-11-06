import { Heart, Menu, Plus } from "lucide-react"
import { useState } from "react"
import { Link, NavLink } from "react-router"
import { Logo } from "@/components/common/logo"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PATHS } from "@/constants/app"
import { ROLE_LABELS } from "@/constants/status"
import { useAuth } from "@/features/auth/auth-context"
import { useFavoriteIds } from "@/features/favorites/use-favorites"
import { cn } from "@/lib/utils"
import { useSiteNav, type SiteNavGroup, type SiteNavItem } from "./use-site-nav"
import { UserMenu } from "./user-menu"

function NavCount({ item, className }: { item: SiteNavItem; className?: string }) {
  if (!item.count) return null
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-mango px-1 text-caption leading-none font-semibold text-mango-foreground tabular",
        className,
      )}
    >
      {item.count}
      <span className="sr-only"> {item.countLabel}</span>
    </span>
  )
}

function DesktopNavLink({ item }: { item: SiteNavItem }) {
  const base = "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors"
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(base, isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {item.label}
      <NavCount item={item} />
    </NavLink>
  )
}

function DesktopNavGroup({ group, ariaLabel }: { group: SiteNavGroup; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="hidden items-center lg:flex">
      <ul className="flex items-center gap-0.5">
        {group.items
          .filter((item) => !item.compact)
          .map((item) => (
            <li key={item.to}>
              <DesktopNavLink item={item} />
            </li>
          ))}
      </ul>
    </nav>
  )
}

function MobileNavLink({ item, onNavigate }: { item: SiteNavItem; onNavigate: () => void }) {
  const Icon = item.icon
  const base = "flex h-11 items-center gap-3 rounded-lg px-3 text-body font-medium transition-colors"
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cn(base, isActive ? "bg-muted font-semibold" : "hover:bg-muted")}
    >
      <Icon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      <NavCount item={item} className="h-5 min-w-5 text-caption" />
    </NavLink>
  )
}

function SavedLink({ className }: { className?: string }) {
  const count = useFavoriteIds().size
  return (
    <Button variant="ghost" size="icon" asChild className={cn("relative", className)}>
      <Link to={PATHS.favorites} aria-label={`Saved places${count ? `, ${count} saved` : ""}`}>
        <Heart aria-hidden="true" />
        {count > 0 && (
          <span className="absolute top-1 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-caption leading-none font-semibold text-primary-foreground tabular">
            {count}
          </span>
        )}
      </Link>
    </Button>
  )
}

export function SiteHeader({
  variant = "solid",
  accountLinks = true,
}: {
  variant?: "solid" | "plain"
  /** Off where the page has its own navigation for these links (the admin rail). The menu sheet always lists them. */
  accountLinks?: boolean
}) {
  const { user } = useAuth()
  const groups = useSiteNav()
  const browse = groups.find((group) => group.id === "browse")
  const account = groups.find((group) => group.id === "account")
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-(--header-height) border-b transition-colors",
        variant === "solid" ? "border-border bg-card" : "border-transparent bg-background",
      )}
    >
      <div className="container-page flex h-full items-center gap-6">
        {/* Landlords' and admins' home is their workspace; "Find a place" still takes them to the marketplace. */}
        <Logo to={user?.role === "landlord" ? PATHS.landlord.dashboard : user?.role === "admin" ? PATHS.admin.overview : undefined} />

        {browse && <DesktopNavGroup group={browse} ariaLabel="Main" />}

        <div className="ml-auto flex items-center gap-1.5">
          {!user && <SavedLink />}
          {account && accountLinks && <DesktopNavGroup group={account} ariaLabel={account.label} />}
          {user?.role === "renter" && <SavedLink className="lg:hidden" />}

          {user ? (
            <UserMenu />
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button variant="ghost" asChild>
                <Link to={PATHS.login}>Sign in</Link>
              </Button>
              <Button asChild>
                <Link to={PATHS.register}>Create account</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(20rem,88vw)] flex-col gap-0">
              <SheetHeader className="border-b border-border">
                {user ? (
                  <div className="flex items-center gap-3 pr-8">
                    <UserAvatar name={user.name} className="size-10" />
                    <div className="min-w-0">
                      <SheetTitle className="truncate text-base">{user.name}</SheetTitle>
                      <SheetDescription className="truncate">{ROLE_LABELS[user.role]} account</SheetDescription>
                    </div>
                  </div>
                ) : (
                  <>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">Site navigation</SheetDescription>
                    <Logo />
                  </>
                )}
              </SheetHeader>

              <nav aria-label="Mobile" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                {groups.map((group) => (
                  <div key={group.id} className="space-y-0.5">
                    {groups.length > 1 && <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>}
                    {group.items.map((item) => (
                      <MobileNavLink key={item.to} item={item} onNavigate={close} />
                    ))}
                  </div>
                ))}
              </nav>

              {(!user || user.role === "landlord") && (
                <div className="grid gap-2 border-t border-border p-4">
                  {user ? (
                    <Button asChild size="lg">
                      <Link to={PATHS.landlord.newProperty} onClick={close}>
                        <Plus aria-hidden="true" />
                        Add property
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg">
                        <Link to={PATHS.register} onClick={close}>
                          Create account
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to={PATHS.login} onClick={close}>
                          Sign in
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
