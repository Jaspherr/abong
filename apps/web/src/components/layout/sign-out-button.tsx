import { LogOut } from "lucide-react"
import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { useSignOut } from "./use-sign-out"

export function SignOutButton({ variant = "outline", ...props }: ComponentProps<typeof Button>) {
  const signOut = useSignOut()
  return (
    <Button variant={variant} onClick={signOut} {...props}>
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  )
}
