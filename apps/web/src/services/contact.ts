import { db } from "./mock/db"

/**
 * Whether a renter and a landlord are in touch both ways: the landlord has replied in
 * one of the renter's inquiries, has confirmed (or completed) one of their viewings, or
 * they share a stay both confirmed.
 * A renter writing first isn't enough, so nobody can unlock the other's details
 * just by sending a message.
 */
export function inMutualContact(renterUserId: string, landlordProfileId: string): boolean {
  const landlord = db.landlordProfiles.find((l) => l.id === landlordProfileId)
  if (!landlord) return false

  const replied = db.inquiries.some(
    (i) =>
      i.renterId === renterUserId &&
      i.landlordId === landlordProfileId &&
      // Automated messages (such as the demo's simulated replies) aren't the landlord answering.
      i.messages.some((m) => m.senderId === landlord.userId && !m.automated),
  )
  if (replied) return true

  const viewed = db.viewings.some(
    (v) =>
      v.renterId === renterUserId &&
      v.landlordId === landlordProfileId &&
      (v.status === "confirmed" || v.status === "completed"),
  )
  if (viewed) return true

  // A stay both sides confirmed is contact too, including a past one.
  return db.rentals.some(
    (r) =>
      r.renterId === renterUserId &&
      r.landlordId === landlordProfileId &&
      (r.status === "confirmed" || r.status === "ended"),
  )
}

/** The same check from two user ids, whichever of them is the landlord. */
export function usersInMutualContact(a: string, b: string): boolean {
  const users = [a, b].map((id) => db.users.find((u) => u.id === id))
  const renter = users.find((u) => u?.role === "renter")
  const landlordUser = users.find((u) => u?.role === "landlord")
  if (!renter || !landlordUser) return false
  const profile = db.landlordProfiles.find((l) => l.userId === landlordUser.id)
  return profile ? inMutualContact(renter.id, profile.id) : false
}
