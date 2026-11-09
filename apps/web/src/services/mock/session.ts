import type { User } from "@/types"
import { db } from "./db"
import { ServiceError } from "./latency"

/**
 * Who is calling, as the services see it. A real backend reads this from its own session
 * and never trusts an id sent by the page; the mock services do the same with the
 * remembered sign-in, so admin checks don't depend on what the UI chooses to pass.
 *
 * This runs in the browser, so it is defence in depth, not security: anyone can edit
 * localStorage. See docs/backend-integration.md.
 */
const SESSION_KEY = "abong:session"

/** Kept in memory too, for browsers where storage is unavailable. */
let current: string | null | undefined

export function rememberSession(userId: string | null) {
  current = userId
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Session falls back to memory only.
  }
}

export function sessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY) ?? null
  } catch {
    return current ?? null
  }
}

export function sessionUser(): User | undefined {
  const id = sessionUserId()
  return id ? db.users.find((u) => u.id === id) : undefined
}

/** Refuses the call unless it comes from an active admin, and returns that admin. */
export function requireAdmin(): User {
  const user = sessionUser()
  if (!user || user.role !== "admin" || user.status !== "active") {
    throw new ServiceError("forbidden", "Only a signed-in admin can do this.")
  }
  return user
}

/** Refuses the call unless someone with an active account is signed in, and returns them. */
export function requireUser(): User {
  const user = sessionUser()
  if (!user || user.status === "suspended" || user.status === "deactivated") {
    throw new ServiceError("forbidden", "Sign in to do this.")
  }
  return user
}
