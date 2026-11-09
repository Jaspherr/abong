import type { Inquiry, Listing, Message, User } from "@/types"
import { toListing } from "./listings.service"
import { db, nextId } from "./mock/db"
import { notFound, respond } from "./mock/latency"

export interface InquiryThread extends Inquiry {
  listing: Pick<Listing, "id" | "name" | "photos" | "priceFrom" | "pricingBasis" | "address" | "type">
  unitName?: string
  renter: Pick<User, "id" | "name">
  landlord: { id: string; userId: string; name: string }
}

function hydrate(inquiry: Inquiry): InquiryThread {
  const property = db.properties.find((p) => p.id === inquiry.listingId) ?? notFound("Listing")
  const listing = toListing(property)
  const renter = db.users.find((u) => u.id === inquiry.renterId) ?? notFound("Renter")
  const landlord = db.landlordProfiles.find((l) => l.id === inquiry.landlordId) ?? notFound("Landlord")
  return {
    ...inquiry,
    listing: {
      id: listing.id,
      name: listing.name,
      photos: listing.photos.slice(0, 1),
      priceFrom: listing.priceFrom,
      pricingBasis: listing.pricingBasis,
      address: listing.address,
      type: listing.type,
    },
    unitName: property.units.find((u) => u.id === inquiry.unitId)?.name,
    renter: { id: renter.id, name: renter.name },
    landlord: { id: landlord.id, userId: landlord.userId, name: landlord.displayName },
  }
}

const byRecent = (a: Inquiry, b: Inquiry) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)

export const inquiriesService = {
  listForRenter(renterId: string): Promise<InquiryThread[]> {
    return respond(() => db.inquiries.filter((i) => i.renterId === renterId).sort(byRecent).map(hydrate))
  },

  listForLandlord(landlordId: string): Promise<InquiryThread[]> {
    return respond(() => db.inquiries.filter((i) => i.landlordId === landlordId).sort(byRecent).map(hydrate))
  },

  create(input: { listingId: string; unitId?: string; renterId: string; body: string }): Promise<InquiryThread> {
    return respond(() => {
      const property = db.properties.find((p) => p.id === input.listingId) ?? notFound("Listing")
      const now = new Date().toISOString()
      const existing = db.inquiries.find((i) => i.listingId === input.listingId && i.renterId === input.renterId)
      const message: Message = { id: nextId("m"), senderId: input.renterId, body: input.body, sentAt: now }
      if (existing) {
        existing.messages.push(message)
        existing.updatedAt = now
        if (input.unitId) existing.unitId = input.unitId
        existing.unreadForLandlord += 1
        existing.status = "open"
        return hydrate(existing)
      }
      const inquiry: Inquiry = {
        id: nextId("inq"),
        listingId: property.id,
        unitId: input.unitId,
        renterId: input.renterId,
        landlordId: property.landlordId,
        messages: [message],
        status: "open",
        unreadForRenter: 0,
        unreadForLandlord: 1,
        createdAt: now,
        updatedAt: now,
      }
      db.inquiries.unshift(inquiry)
      return hydrate(inquiry)
    }, 500)
  },

  /** `automated` marks messages no person wrote, such as the demo's simulated replies; they never count as a response. */
  sendMessage(inquiryId: string, senderId: string, body: string, options?: { automated?: boolean }): Promise<InquiryThread> {
    return respond(() => {
      const inquiry = db.inquiries.find((i) => i.id === inquiryId) ?? notFound("Conversation")
      const now = new Date().toISOString()
      inquiry.messages.push({ id: nextId("m"), senderId, body, sentAt: now, ...(options?.automated && { automated: true }) })
      inquiry.updatedAt = now
      if (senderId === inquiry.renterId) inquiry.unreadForLandlord += 1
      else inquiry.unreadForRenter += 1
      return hydrate(inquiry)
    }, 220)
  },

  markRead(inquiryId: string, as: "renter" | "landlord"): Promise<void> {
    return respond(() => {
      const inquiry = db.inquiries.find((i) => i.id === inquiryId)
      if (!inquiry) return
      if (as === "renter") inquiry.unreadForRenter = 0
      else inquiry.unreadForLandlord = 0
    }, 60)
  },

  setStatus(inquiryId: string, status: Inquiry["status"]): Promise<void> {
    return respond(() => {
      const inquiry = db.inquiries.find((i) => i.id === inquiryId) ?? notFound("Conversation")
      inquiry.status = status
    })
  },
}
