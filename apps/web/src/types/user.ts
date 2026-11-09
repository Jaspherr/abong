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
  /** Why an admin suspended or deactivated the account. Cleared on reactivation. */
  statusReason?: string
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
  languages: string[]
  verifications: Record<VerificationType, VerificationStatus>
}

export interface Session {
  user: User
  renterProfile?: RenterProfile
  landlordProfile?: LandlordProfile
}

/**
 * Who can see a profile photo besides its owner and Abong admins.
 * - "public": anyone, including guests. Offered to landlords only.
 * - "contacts": the other side of a conversation that has gone both ways (see services/contact.ts).
 * - "private": nobody else.
 */
export type PhotoVisibility = "public" | "contacts" | "private"

export interface ProfilePhoto {
  userId: string
  /** A re-encoded square image (WebP, or JPEG where the browser can't write WebP), as a data URL. */
  dataUrl: string
  visibility: PhotoVisibility
  updatedAt: string
}

/** What the owner sees about their own photo. */
export interface OwnPhoto {
  url?: string
  visibility: PhotoVisibility
  updatedAt?: string
}

/** How a landlord answers inquiries, measured from messages (services/reputation.ts). */
export interface ResponseStats {
  /** Inquiries that counted: opened in the window, and either answered or older than the deadline. */
  sample: number
  /** Whether there were enough to show figures at all. */
  measured: boolean
  /** Share answered within the deadline, 0–1. Only when measured. */
  rate?: number
  /** Median hours to a first reply, across inquiries that got one. Only when measured. */
  medianHours?: number
}
