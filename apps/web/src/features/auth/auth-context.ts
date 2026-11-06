import { createContext, useContext } from "react"
import { PATHS } from "@/constants/app"
import type { RegisterInput } from "@/services"
import type { Session, UserRole } from "@/types"

export interface AuthContextValue {
  session: Session | null
  user: Session["user"] | null
  role: UserRole | null
  signIn: (email: string) => Promise<Session>
  signInAs: (role: UserRole) => Promise<Session>
  register: (input: RegisterInput) => Promise<Session>
  signOut: () => void
  setSession: (session: Session) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** Home route for each role, used after sign-in and by the role switcher. */
export function homeForRole(role: UserRole) {
  if (role === "landlord") return "/landlord/dashboard"
  if (role === "admin") return "/admin"
  return "/"
}

/** Profile page for each role. Admins don't have one. */
export function profilePathForRole(role: UserRole): string | null {
  if (role === "renter") return PATHS.profile
  if (role === "landlord") return PATHS.landlord.profile
  if (role === "admin") return PATHS.admin.profile
  return null
}
