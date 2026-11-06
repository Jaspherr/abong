import type { Listing, User, ViewingRequest, ViewingStatus } from "@/types"
import { toListing } from "./listings.service"
import { db, nextId } from "./mock/db"
import { notFound, respond } from "./mock/latency"

export interface ViewingWithContext extends ViewingRequest {
  listing: Pick<Listing, "id" | "name" | "photos" | "address" | "type">
  unitName?: string
  renter: Pick<User, "id" | "name" | "phone">
  landlordName: string
}

function hydrate(v: ViewingRequest): ViewingWithContext {
  const property = db.properties.find((p) => p.id === v.listingId) ?? notFound("Listing")
  const listing = toListing(property)
  const renter = db.users.find((u) => u.id === v.renterId) ?? notFound("Renter")
  const landlord = db.landlordProfiles.find((l) => l.id === v.landlordId)
  return {
    ...v,
    listing: { id: listing.id, name: listing.name, photos: listing.photos.slice(0, 1), address: listing.address, type: listing.type },
    unitName: property.units.find((u) => u.id === v.unitId)?.name,
    renter: { id: renter.id, name: renter.name, phone: renter.phone },
    landlordName: landlord?.displayName ?? "Landlord",
  }
}

const bySchedule = (a: ViewingRequest, b: ViewingRequest) =>
  `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)

export const viewingsService = {
  listForRenter(renterId: string): Promise<ViewingWithContext[]> {
    return respond(() => db.viewings.filter((v) => v.renterId === renterId).sort(bySchedule).map(hydrate))
  },

  listForLandlord(landlordId: string): Promise<ViewingWithContext[]> {
    return respond(() => db.viewings.filter((v) => v.landlordId === landlordId).sort(bySchedule).map(hydrate))
  },

  request(input: { listingId: string; unitId?: string; renterId: string; date: string; time: string; message?: string }) {
    return respond(() => {
      const property = db.properties.find((p) => p.id === input.listingId) ?? notFound("Listing")
      const now = new Date().toISOString()
      const viewing: ViewingRequest = {
        id: nextId("v"),
        ...input,
        landlordId: property.landlordId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }
      db.viewings.push(viewing)
      return hydrate(viewing)
    }, 500)
  },

  setStatus(id: string, status: ViewingStatus, landlordNote?: string) {
    return respond(() => {
      const viewing = db.viewings.find((v) => v.id === id) ?? notFound("Viewing request")
      viewing.status = status
      if (landlordNote !== undefined) viewing.landlordNote = landlordNote
      viewing.updatedAt = new Date().toISOString()
      return hydrate(viewing)
    })
  },

  reschedule(id: string, date: string, time: string, landlordNote?: string) {
    return respond(() => {
      const viewing = db.viewings.find((v) => v.id === id) ?? notFound("Viewing request")
      Object.assign(viewing, { date, time, status: "confirmed", updatedAt: new Date().toISOString() })
      if (landlordNote) viewing.landlordNote = landlordNote
      return hydrate(viewing)
    })
  },
}
