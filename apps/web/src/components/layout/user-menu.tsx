import { Repeat, RotateCcw } from "lucide-react"
import { Link } from "react-router"
import { useDemoRoleSwitch } from "@/features/auth/use-demo-role-switch"
import { PersonAvatar } from "@/features/profile/person-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DEMO_MODE } from "@/constants/app"
import { ROLE_LABELS } from "@/constants/status"
import { profilePathForRole, useAuth } from "@/features/auth/auth-context"
import { resetDemoData } from "@/services"

/** The signed-in person's name links to their profile; the avatar opens the demo actions. */
export function UserMenu({ align = "end" }: { align?: "start" | "end" }) {
  const { user } = useAuth()
  const switchRole = useDemoRoleSwitch()
  if (!user) return null

  const firstName = user.name.split(" ")[0]
  const profilePath = profilePathForRole(user.role)

  return (
    <div className="flex items-center">
      {profilePath ? (
        <Button variant="ghost" asChild className="hidden h-10 px-2 lg:inline-flex">
          <Link to={profilePath} aria-label={`Profile for ${user.name}`}>
            <span className="max-w-32 truncate text-sm font-medium">{firstName}</span>
          </Link>
        </Button>
      ) : (
        <span className="hidden max-w-32 truncate px-2 text-sm font-medium lg:inline">{firstName}</span>
      )}
      {DEMO_MODE ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10">
              <span className="sr-only">Demo menu for {user.name}</span>
              <PersonAvatar userId={user.id} name={user.name} className="size-8" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="w-72">
            <DropdownMenuLabel className="flex items-center gap-3 py-2">
              <PersonAvatar userId={user.id} name={user.name} className="size-9" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                  <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-caption leading-none font-semibold text-secondary-foreground">
                    {ROLE_LABELS[user.role]}
                  </span>
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                resetDemoData()
                window.location.reload()
              }}
            >
              <RotateCcw aria-hidden="true" />
              Reset demo data
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Repeat aria-hidden="true" />
                Switch demo role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["renter", "landlord", "admin"] as const).map((role) => (
                  <DropdownMenuItem key={role} disabled={role === user.role} onSelect={() => switchRole(role)}>
                    {ROLE_LABELS[role]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : profilePath ? (
        // With no demo actions there is no menu to open, so the avatar goes straight to the profile.
        <Button variant="ghost" size="icon" asChild className="size-10">
          <Link to={profilePath} aria-label={`Profile for ${user.name}`}>
            <PersonAvatar userId={user.id} name={user.name} className="size-8" />
          </Link>
        </Button>
      ) : (
        <PersonAvatar userId={user.id} name={user.name} className="size-8" />
      )}
    </div>
  )
}
