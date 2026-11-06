import { useCallback, useMemo, useState, type ReactNode } from "react"
import { queryClient } from "@/lib/query"
import { authService } from "@/services"
import type { Session } from "@/types"
import { AuthContext, type AuthContextValue } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => authService.restore())

  const setSession = useCallback((next: Session | null) => {
    setSessionState(next)
    // Role-scoped data must not leak between demo accounts.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "listings" && q.queryKey[0] !== "places" })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.user.role ?? null,
      setSession,
      signIn: async (email) => {
        const next = await authService.signIn(email)
        setSession(next)
        return next
      },
      signInAs: async (role) => {
        const next = await authService.signInAs(role)
        setSession(next)
        return next
      },
      register: async (input) => {
        const next = await authService.register(input)
        setSession(next)
        return next
      },
      signOut: () => {
        authService.signOut()
        setSession(null)
      },
    }),
    [session, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
