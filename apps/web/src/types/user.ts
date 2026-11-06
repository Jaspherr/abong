export type UserRole = "renter" | "landlord" | "admin"

export type AccountStatus = "active" | "pending" | "suspended" | "deactivated"

export type VerificationType = "identity" | "contact" | "property"

export type VerificationStatus =
  | "not-started"
  | "pending"
  | "verified"
  | "rejected"
  | "needs-update"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  status: AccountStatus
  municipalityId?: string
  joinedAt: string
  lastActiveAt: string
  /** Identity-level verification shown on admin tables. */
  verification: VerificationStatus
}

export type RenterOccupation = "student" | "professional" | "family" | "other"

export interface RenterProfile {
  userId: string
  occupation: RenterOccupation
  universityId?: string
  workplace?: string
  moveInBy?: string
  budgetMax?: number
  bio?: string
}

export interface LandlordProfile {
  id: string
  userId: string
  displayName: string
  businessName?: string
  bio: string
  municipalityId: string
  memberSince: string
  /** Share of inquiries answered, 0–1. */
  responseRate: number
  responseTimeHours: number
  languages: string[]
  verifications: Record<VerificationType, VerificationStatus>
}

export interface Session {
  user: User
  renterProfile?: RenterProfile
  landlordProfile?: LandlordProfile
}
