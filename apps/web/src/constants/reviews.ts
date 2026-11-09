import type { RentalPhase, ReviewAspect, ReviewKind, ReviewReportReason, ReviewStatus } from "@/types"
import type { Tone } from "./status"

export const REVIEW_KIND: Record<ReviewKind, { label: string; badge: string; description: string }> = {
  residence: {
    label: "Resident reviews",
    badge: "Verified stay",
    description: "From renters who lived here, after a stay both sides confirmed.",
  },
  viewing: {
    label: "Viewing feedback",
    badge: "Verified viewing",
    description: "From renters who visited, after a viewing the landlord marked completed. It covers the visit only.",
  },
}

export const REVIEW_ASPECTS: Record<ReviewAspect, { label: string; hint: string }> = {
  communication: { label: "Communication", hint: "Clear, helpful and quick to respond" },
  accuracy: { label: "Listing accuracy", hint: "The place, rent, deposit, rules and amenities matched the listing" },
  maintenance: { label: "Maintenance and support", hint: "Problems were handled and followed through" },
  professionalism: { label: "Professionalism", hint: "Respectful and fair treatment" },
  reliability: { label: "Showed up as agreed", hint: "Someone was there to show the place at the agreed time" },
  punctuality: { label: "Punctuality", hint: "The viewing started on time" },
}

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone; hint: string }> = {
  published: { label: "Public", tone: "success", hint: "Anyone can read it." },
  held: { label: "On hold", tone: "warning", hint: "The stay is being looked into, so the review is hidden for now." },
  hidden: { label: "Removed", tone: "danger", hint: "Abong removed it for breaking the review rules." },
  withdrawn: { label: "Deleted", tone: "neutral", hint: "You deleted this review." },
}

export const REVIEW_REPORT_REASONS: Record<ReviewReportReason, { label: string; hint: string }> = {
  "false-information": { label: "False information", hint: "States things that aren't true" },
  "personal-information": { label: "Personal information", hint: "Shares a phone number, address or other private details" },
  harassment: { label: "Harassment or hate", hint: "Insults, threats or discrimination" },
  "not-genuine": { label: "Not a real experience", hint: "The writer didn't actually stay or visit" },
  other: { label: "Something else", hint: "Tell us what's wrong" },
}

export const RENTAL_PHASE: Record<RentalPhase, { label: string; tone: Tone }> = {
  pending: { label: "Waiting for confirmation", tone: "warning" },
  upcoming: { label: "Moving in soon", tone: "info" },
  current: { label: "Living here", tone: "success" },
  past: { label: "Moved out", tone: "neutral" },
  closed: { label: "Not confirmed", tone: "neutral" },
  disputed: { label: "Under review", tone: "warning" },
}

/** Shown wherever a renter writes a review. */
export const REVIEW_RULES = [
  "Describe your own experience. Critical reviews are welcome when they're honest.",
  "Leave out phone numbers, addresses and other people's private details.",
  "Landlords can reply publicly but can't edit or remove your review.",
  "Abong removes reviews only for breaking these rules, never for being negative.",
]
