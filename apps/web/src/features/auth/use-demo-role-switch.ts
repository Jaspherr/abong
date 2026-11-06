import { useNavigate } from "react-router"
import { toast } from "sonner"
import { ROLE_LABELS } from "@/constants/status"
import type { UserRole } from "@/types"
import { homeForRole, useAuth } from "./auth-context"

/** Signs in as a demo account for the given role and opens that role's home. */
export function useDemoRoleSwitch() {
  const { signInAs } = useAuth()
  const navigate = useNavigate()
  return async (role: UserRole) => {
    try {
      const session = await signInAs(role)
      toast.success(`Viewing as ${session.user.name}`, { description: `Demo ${ROLE_LABELS[role].toLowerCase()} account` })
      navigate(homeForRole(role))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }
}
