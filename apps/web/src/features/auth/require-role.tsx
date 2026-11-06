import { Lock } from "lucide-react"
import { Link, Navigate, Outlet, useLocation } from "react-router"
import { EmptyState } from "@/components/feedback/states"
import { Button } from "@/components/ui/button"
import { DEMO_MODE, PATHS } from "@/constants/app"
import { ROLE_LABELS } from "@/constants/status"
import { useDemoRoleSwitch } from "./use-demo-role-switch"
import type { UserRole } from "@/types"
import { homeForRole, useAuth } from "./auth-context"

/** Route guard: redirects guests to sign-in and explains role mismatches instead of silently bouncing. */
export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useAuth()
  const location = useLocation()
  const switchRole = useDemoRoleSwitch()

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${PATHS.login}?next=${next}&as=${role}`} replace />
  }

  if (user.role !== role) {
    const area = ROLE_LABELS[role].toLowerCase()
    return (
      <div className="container-page grid min-h-[70svh] place-items-center">
        <EmptyState
          icon={Lock}
          title={`This area is for ${area}s`}
          description={`You're signed in as a ${ROLE_LABELS[user.role].toLowerCase()}. ${
            DEMO_MODE ? `Switch to the demo ${area} account to continue.` : `Sign in with a ${area} account to continue.`
          }`}
          action={
            <>
              {DEMO_MODE && <Button onClick={() => switchRole(role)}>Switch to demo {area}</Button>}
              <Button variant="outline" asChild>
                <Link to={homeForRole(user.role)}>Go to my home</Link>
              </Button>
            </>
          }
        />
      </div>
    )
  }

  return <Outlet />
}
