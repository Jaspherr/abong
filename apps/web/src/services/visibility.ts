import type { Property } from "@/types"
import { db } from "./mock/db"

/**
 * Worked out from the account rather than stored on the listing, so reactivating
 * a landlord brings their listings back exactly as they were.
 */
export function isLandlordVisible(property: Property) {
  const profile = db.landlordProfiles.find((l) => l.id === property.landlordId)
  const status = db.users.find((u) => u.id === profile?.userId)?.status
  return status !== "suspended" && status !== "deactivated"
}

/** Whether renters can find this property. */
export const isPublic = (property: Property) => property.status === "active" && isLandlordVisible(property)
