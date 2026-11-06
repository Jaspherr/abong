import type {
  AccountStatus,
  ListingStatus,
  ReportReason,
  ReportStatus,
  UserRole,
  VerificationStatus,
  VerificationType,
  ViewingStatus,
} from "@/types"

/** Semantic tones shared by every status badge so colours mean the same thing everywhere. */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand"

interface StatusMeta {
  label: string
  tone: Tone
}

export const LISTING_STATUS: Record<ListingStatus, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  "pending-review": { label: "Pending review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
}

export const VERIFICATION_STATUS: Record<VerificationStatus, StatusMeta> = {
  "not-started": { label: "Not started", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  "needs-update": { label: "Needs update", tone: "info" },
}

export const VERIFICATION_TYPES: Record<VerificationType, { label: string; description: string }> = {
  identity: {
    label: "Identity",
    description: "Confirms the person behind the account using a government-issued ID.",
  },
  contact: {
    label: "Contact information",
    description: "Confirms the mobile number and email renters will use to reach you.",
  },
  property: {
    label: "Property",
    description: "Confirms you own or manage the property, e.g. via a barangay permit or utility bill.",
  },
}

export const VIEWING_STATUS: Record<ViewingStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
}

export const ACCOUNT_STATUS: Record<AccountStatus, StatusMeta> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  suspended: { label: "Suspended", tone: "danger" },
  deactivated: { label: "Deactivated", tone: "neutral" },
}

export const ROLE_LABELS: Record<UserRole, string> = {
  renter: "Renter",
  landlord: "Landlord",
  admin: "Admin",
}

export const REPORT_REASONS: Record<ReportReason, { label: string; hint: string }> = {
  "incorrect-information": { label: "Incorrect information", hint: "Price, photos or details don't match" },
  "scam-concern": { label: "Possible scam", hint: "Asked for payment before a viewing, or similar" },
  "unavailable-property": { label: "Property not available", hint: "Already rented or doesn't exist" },
  "duplicate-listing": { label: "Duplicate listing", hint: "Same property posted more than once" },
  "inappropriate-content": { label: "Inappropriate content", hint: "Offensive text or photos" },
  "suspicious-landlord": { label: "Suspicious landlord", hint: "Identity or behaviour seems off" },
  other: { label: "Something else", hint: "Tell us what happened" },
}

export const REPORT_STATUS: Record<ReportStatus, StatusMeta> = {
  open: { label: "Open", tone: "warning" },
  investigating: { label: "Investigating", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  dismissed: { label: "Dismissed", tone: "neutral" },
}
