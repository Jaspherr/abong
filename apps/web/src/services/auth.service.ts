import { DEMO_MODE } from "@/constants/app"
import { DEMO_ACCOUNTS } from "@/data/users"
import type { RenterProfile, Session, User, UserRole } from "@/types"
import { db, nextId } from "./mock/db"
import { ServiceError, respond } from "./mock/latency"
import { rememberSession as remember, sessionUserId } from "./mock/session"

/**
 * Mock authentication. There are no passwords: any password signs in a known
 * demo email. The real implementation will exchange credentials for a token.
 */
function buildSession(user: User): Session {
  return {
    user,
    renterProfile: db.renterProfiles.find((p) => p.userId === user.id),
    landlordProfile: db.landlordProfiles.find((p) => p.userId === user.id),
  }
}

export interface RegisterInput {
  role: Extract<UserRole, "renter" | "landlord">
  name: string
  email: string
  phone: string
  municipalityId: string
  occupation?: RenterProfile["occupation"]
  businessName?: string
}

export const authService = {
  restore(): Session | null {
    try {
      const id = sessionUserId()
      const user = id ? db.users.find((u) => u.id === id) : undefined
      // A suspension takes effect on the next visit, not only at the next sign-in.
      if (user?.status === "suspended") {
        remember(null)
        return null
      }
      return user ? buildSession(user) : null
    } catch {
      return null
    }
  },

  signIn(email: string): Promise<Session> {
    return respond(() => {
      const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user) throw new ServiceError("invalid", "That email and password don't match an account.")
      if (user.status === "suspended") throw new ServiceError("forbidden", "This account is suspended. Contact support to restore access.")
      remember(user.id)
      return buildSession(user)
    }, 600)
  },

  signInAs(role: UserRole): Promise<Session> {
    return respond(() => {
      if (!DEMO_MODE) throw new ServiceError("forbidden", "Demo accounts aren't available in this build.")
      const user = db.users.find((u) => u.id === DEMO_ACCOUNTS[role])
      if (!user) throw new ServiceError("not-found", "Demo account missing.")
      if (user.status === "suspended") throw new ServiceError("forbidden", "This demo account is suspended. Reset the demo data or reactivate it as an admin.")
      remember(user.id)
      return buildSession(user)
    }, 200)
  },

  register(input: RegisterInput): Promise<Session> {
    return respond(() => {
      const email = input.email.trim()
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new ServiceError("invalid", "An account with this email already exists. Try signing in instead.")
      }
      const now = new Date().toISOString()
      const user: User = {
        id: nextId("u"),
        name: input.name,
        email,
        phone: input.phone,
        role: input.role,
        status: "active",
        municipalityId: input.municipalityId,
        joinedAt: now,
        lastActiveAt: now,
        verification: "not-started",
      }
      db.users.push(user)
      if (input.role === "renter") {
        db.renterProfiles.push({ userId: user.id, occupation: input.occupation ?? "student" })
      } else {
        db.landlordProfiles.push({
          id: nextId("l"),
          userId: user.id,
          displayName: input.name,
          businessName: input.businessName,
          bio: "",
          municipalityId: input.municipalityId,
          memberSince: now,
          responseRate: 1,
          responseTimeHours: 0,
          languages: ["Filipino", "English"],
          verifications: { identity: "not-started", contact: "not-started", property: "not-started" },
        })
      }
      remember(user.id)
      return buildSession(user)
    }, 800)
  },

  requestPasswordReset(email: string): Promise<void> {
    // Always succeeds so the UI never reveals which emails have accounts.
    return respond(() => void email, 700)
  },

  updateRenterProfile(userId: string, patch: Partial<Pick<User, "name" | "phone" | "municipalityId">> & Partial<Omit<RenterProfile, "userId">>) {
    return respond(() => {
      const user = db.users.find((u) => u.id === userId)
      if (!user) throw new ServiceError("not-found", "Account not found.")
      const { name, phone, municipalityId, ...profilePatch } = patch
      Object.assign(user, Object.fromEntries(Object.entries({ name, phone, municipalityId }).filter(([, v]) => v !== undefined)))
      let profile = db.renterProfiles.find((p) => p.userId === userId)
      if (!profile) {
        profile = { userId, occupation: "student" }
        db.renterProfiles.push(profile)
      }
      Object.assign(profile, profilePatch)
      return buildSession(user)
    }, 500)
  },

  signOut() {
    remember(null)
  },
}
