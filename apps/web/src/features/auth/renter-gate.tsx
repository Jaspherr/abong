import { UserRound } from "lucide-react"
import { Link, useLocation } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DEMO_MODE, PATHS } from "@/constants/app"
import { useAuth } from "./auth-context"

/**
 * Shown inside renter-only dialogs (inquire, request viewing) for guests and
 * non-renter accounts, so the action never fails silently.
 */
export function RenterGate({ action }: { action: string }) {
  const { user, signInAs } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)
  const continueAsRenter = () => signInAs("renter").catch((error: Error) => toast.error(error.message))

  if (user && user.role !== "renter") {
    return (
      <div className="space-y-3 rounded-2xl bg-muted p-5 text-sm">
        <p className="font-medium">Only renter accounts can {action}.</p>
        <p className="text-muted-foreground">You're signed in as a {user.role}. Switch to a renter account to continue.</p>
        {DEMO_MODE && (
          <Button variant="outline" onClick={continueAsRenter}>
            Use demo renter account
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted px-5 py-7 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-card text-primary">
        <UserRound className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">Sign in to {action}</p>
        <p className="text-sm text-muted-foreground">Landlords reply to your account so your conversations stay in one place.</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to={`${PATHS.login}?next=${next}`}>Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`${PATHS.register}?next=${next}`}>Create account</Link>
        </Button>
      </div>
      {DEMO_MODE && (
        <button type="button" onClick={continueAsRenter} className="text-sm font-medium text-primary underline-offset-4 underline decoration-transparent transition-colors hover:decoration-current">
          Continue with the demo renter account
        </button>
      )}
    </div>
  )
}
