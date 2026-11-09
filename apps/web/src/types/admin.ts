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

/** A count worked out from the records themselves, with how many of them are recent. */
export interface AdminMetric {
  id: string
  label: string
  value: number
  /** How many of `value` joined or were created in the last 30 days. */
  recent: number
}

export type ActivityKind =
  | "signup"
  | "listing-submitted"
  | "listing-approved"
  | "verification-submitted"
  | "report-filed"
  | "inquiry"
  | "viewing"
  | "listing-moderated"

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  at: string
  href?: string
}

export type ModerationAction = "approve" | "reject" | "suspend" | "request-changes" | "archive"

/** What an admin decision was about. */
export type AuditArea = "listing" | "verification" | "report" | "account" | "review" | "rental"

/**
 * One admin decision, kept for accountability. Written by the service that made the
 * change, which takes the admin from the session rather than from the caller.
 */
export interface AuditEntry {
  id: string
  at: string
  area: AuditArea
  actorId: string
  actorName: string
  /** The record the decision was about: a listing, verification request, report or user id. */
  targetId: string
  /** A readable name for the target, kept as it was at the time. */
  targetLabel: string
  /** Short past-tense description, e.g. "Suspended account". */
  action: string
  from?: string
  to?: string
  note?: string
}
