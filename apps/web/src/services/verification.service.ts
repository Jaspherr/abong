import type { LandlordProfile, VerificationDocument, VerificationRequest, VerificationStatus, VerificationType } from "@/types"
import { db, nextId } from "./mock/db"
import { notFound, respond } from "./mock/latency"

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
    return respond(() =>
      db.verificationRequests
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
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    )
  },

  review(requestId: string, decision: Extract<VerificationStatus, "verified" | "rejected" | "needs-update">, note?: string) {
    return respond(() => {
      const request = db.verificationRequests.find((r) => r.id === requestId) ?? notFound("Verification request")
      request.status = decision
      request.reviewedAt = new Date().toISOString()
      request.reviewerNote = note
      syncProfile(request.landlordId, request.type, decision)
      if (request.propertyId) {
        const property = db.properties.find((p) => p.id === request.propertyId)
        if (property) property.propertyVerification = decision
      }
      return request
    })
  },
}
