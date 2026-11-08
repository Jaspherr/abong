import { DECISION_NOTE_MIN, VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import type { LandlordProfile, VerificationDocument, VerificationRequest, VerificationStatus, VerificationType } from "@/types"
import { recordDecision, requireNote } from "./audit"
import { db, nextId } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"
import { requireAdmin } from "./mock/session"

export interface LandlordVerificationState {
  statuses: LandlordProfile["verifications"]
  requests: VerificationRequest[]
}

export interface VerificationQueueItem extends VerificationRequest {
  landlordName: string
  landlordEmail: string
  propertyName?: string
}

function syncProfile(landlordId: string, type: VerificationType, status: VerificationStatus) {
  const profile = db.landlordProfiles.find((l) => l.id === landlordId)
  if (profile) profile.verifications[type] = status
  if (type === "property") return
  const user = profile && db.users.find((u) => u.id === profile.userId)
  if (user && type === "identity") user.verification = status
}

export const verificationService = {
  getForLandlord(landlordId: string): Promise<LandlordVerificationState> {
    return respond(() => {
      const profile = db.landlordProfiles.find((l) => l.id === landlordId) ?? notFound("Landlord")
      return {
        statuses: profile.verifications,
        requests: db.verificationRequests
          .filter((r) => r.landlordId === landlordId)
          .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
      }
    })
  },

  /** Records a demo submission. File names are placeholders — no documents are uploaded or stored. */
  submit(landlordId: string, type: VerificationType, documents: VerificationDocument[], propertyId?: string) {
    return respond(() => {
      const request: VerificationRequest = {
        id: nextId("vr"),
        landlordId,
        type,
        propertyId,
        status: "pending",
        submittedAt: new Date().toISOString(),
        documents,
      }
      db.verificationRequests.unshift(request)
      syncProfile(landlordId, type, "pending")
      if (propertyId) {
        const property = db.properties.find((p) => p.id === propertyId)
        if (property) property.propertyVerification = "pending"
      }
      return request
    }, 700)
  },

  listQueue(): Promise<VerificationQueueItem[]> {
    return respond(() => {
      requireAdmin()
      return db.verificationRequests
        .map((r) => {
          const profile = db.landlordProfiles.find((l) => l.id === r.landlordId)
          const user = profile && db.users.find((u) => u.id === profile.userId)
          return {
            ...r,
            landlordName: profile?.displayName ?? "Unknown",
            landlordEmail: user?.email ?? "",
            propertyName: db.properties.find((p) => p.id === r.propertyId)?.name,
          }
        })
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    })
  },

  /**
   * Decides a pending request. Anything short of approval needs a note, because the
   * landlord has to know what to send again.
   */
  review(requestId: string, decision: Extract<VerificationStatus, "verified" | "rejected" | "needs-update">, note?: string) {
    return respond(() => {
      const admin = requireAdmin()
      const request = db.verificationRequests.find((r) => r.id === requestId) ?? notFound("Verification request")
      if (request.status !== "pending") {
        throw new ServiceError("invalid", "This request has already been reviewed. Reload to see the decision.")
      }
      const cleanNote =
        decision === "verified"
          ? note?.trim() || undefined
          : requireNote(note, DECISION_NOTE_MIN, "Explain what's wrong in at least 10 characters, so the landlord can fix it.")

      request.status = decision
      request.reviewedAt = new Date().toISOString()
      request.reviewerNote = cleanNote
      const landlord = db.landlordProfiles.find((l) => l.id === request.landlordId)
      recordDecision(admin, {
        area: "verification",
        targetId: request.id,
        targetLabel: `${VERIFICATION_TYPES[request.type].label} check: ${landlord?.displayName ?? "Unknown landlord"}`,
        action: decision === "verified" ? "Approved verification" : decision === "rejected" ? "Rejected verification" : "Asked for an update",
        from: VERIFICATION_STATUS.pending.label,
        to: VERIFICATION_STATUS[decision].label,
        note: cleanNote,
      })
      syncProfile(request.landlordId, request.type, decision)
      if (request.propertyId) {
        const property = db.properties.find((p) => p.id === request.propertyId)
        if (property) property.propertyVerification = decision
      }
      return request
    })
  },
}
