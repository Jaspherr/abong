import type { VerificationStatus, VerificationType } from "./user"

export type ReportReason =
  | "incorrect-information"
  | "scam-concern"
  | "unavailable-property"
  | "duplicate-listing"
  | "inappropriate-content"
  | "suspicious-landlord"
  | "other"

export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed"

export interface Report {
  id: string
  listingId: string
  reporterId: string | null
  reason: ReportReason
  details: string
  status: ReportStatus
  createdAt: string
  resolutionNote?: string
}

export interface VerificationDocument {
  label: string
  /** Demo placeholder name only — no real documents are stored. */
  fileName: string
}

export interface VerificationRequest {
  id: string
  landlordId: string
  type: VerificationType
  propertyId?: string
  status: VerificationStatus
  submittedAt: string
  reviewedAt?: string
  documents: VerificationDocument[]
  reviewerNote?: string
}

export interface AdminMetric {
  id: string
  label: string
  value: number
  /** Change vs. previous 30 days, as a fraction (0.12 = +12%). */
  delta: number
  series: number[]
  format?: "number" | "percent"
}

export type ActivityKind =
  | "signup"
  | "listing-submitted"
  | "listing-approved"
  | "verification-submitted"
  | "report-filed"
  | "inquiry"
  | "viewing"

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  at: string
  href?: string
}

export type ModerationAction = "approve" | "reject" | "suspend" | "request-changes" | "archive"
