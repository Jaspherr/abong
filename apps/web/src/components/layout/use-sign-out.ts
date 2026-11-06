import { startTransition } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"

/** Signs out, returns to the home page and confirms with a toast. */
export function useSignOut() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return () => {
    // One transition commits both together. Clearing the session while a guarded page is
    // still mounted would make its guard redirect to sign-in instead of home.
    startTransition(async () => {
      await navigate(PATHS.home)
      startTransition(signOut)
      toast("You're signed out")
    })
  }
}
