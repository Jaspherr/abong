import type { Property, RentalUnit, UnitStatus } from "@/types"
import { toListing } from "./listings.service"
import { db, nextId } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"

/** Landlord-side property and unit management. */

export type PropertyDraft = Omit<
  Property,
  "id" | "units" | "status" | "propertyVerification" | "createdAt" | "updatedAt" | "availabilityConfirmedAt" | "views"
>
export type UnitDraft = Omit<RentalUnit, "id" | "propertyId">

export interface ManagedProperty extends Property {
  inquiryCount: number
  pendingViewings: number
  isVerified: boolean
}

function manage(property: Property): ManagedProperty {
  return {
    ...property,
    inquiryCount: db.inquiries.filter((i) => i.listingId === property.id).length,
    pendingViewings: db.viewings.filter((v) => v.listingId === property.id && v.status === "pending").length,
    isVerified: toListing(property).isVerified,
  }
}

function owned(landlordId: string, propertyId: string) {
  const property = db.properties.find((p) => p.id === propertyId && p.landlordId === landlordId)
  return property ?? notFound("Property")
}

const touch = (p: Property) => {
  p.updatedAt = new Date().toISOString()
}

/**
 * Where a place is and what it costs are what renters act on, so a live listing is
 * checked again when either changes. Other edits, like photos and copy, stay live.
 */
function sendBackToReview(property: Property, reason: string) {
  const now = new Date().toISOString()
  property.status = "pending-review"
  property.moderationNote = undefined
  db.activity.unshift({
    id: nextId("a"),
    kind: "listing-submitted",
    title: `${property.name} resubmitted`,
    detail: reason,
    at: now,
    href: `/admin/listings?review=${property.id}`,
  })
}

const sameAddress = (a: Property["address"], b: Property["address"]) =>
  a.street === b.street && a.barangay === b.barangay && a.municipalityId === b.municipalityId && a.zipCode === b.zipCode

export const propertiesService = {
  listForLandlord(landlordId: string): Promise<ManagedProperty[]> {
    return respond(() =>
      db.properties
        .filter((p) => p.landlordId === landlordId)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(manage),
    )
  },

  get(landlordId: string, propertyId: string): Promise<ManagedProperty> {
    return respond(() => manage(owned(landlordId, propertyId)))
  },

  create(landlordId: string, draft: PropertyDraft, submit: boolean): Promise<ManagedProperty> {
    return respond(() => {
      const now = new Date().toISOString()
      const property: Property = {
        ...draft,
        landlordId,
        id: nextId("prop"),
        units: [],
        status: submit ? "pending-review" : "draft",
        propertyVerification: "not-started",
        createdAt: now,
        updatedAt: now,
        availabilityConfirmedAt: now,
        views: 0,
      }
      db.properties.unshift(property)
      return manage(property)
    }, 600)
  },

  update(landlordId: string, propertyId: string, patch: Partial<PropertyDraft>): Promise<ManagedProperty> {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      const moved = patch.address !== undefined && !sameAddress(property.address, patch.address)
      Object.assign(property, patch)
      if (property.status === "active" && moved) sendBackToReview(property, "Address changed")
      touch(property)
      return manage(property)
    }, 450)
  },

  submitForReview(landlordId: string, propertyId: string) {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      if (property.units.length === 0) throw new ServiceError("invalid", "Add at least one unit before submitting.")
      property.status = "pending-review"
      property.moderationNote = undefined
      touch(property)
      return manage(property)
    })
  },

  setArchived(landlordId: string, propertyId: string, archived: boolean) {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      property.status = archived ? "archived" : "draft"
      touch(property)
      return manage(property)
    })
  },

  confirmAvailability(landlordId: string, propertyId: string) {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      property.availabilityConfirmedAt = new Date().toISOString()
      touch(property)
      return manage(property)
    })
  },

  saveUnit(landlordId: string, propertyId: string, unit: UnitDraft, unitId?: string): Promise<{ unit: RentalUnit; backInReview: boolean }> {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      const wasLive = property.status === "active"
      if (unitId) {
        const existing = property.units.find((u) => u.id === unitId) ?? notFound("Unit")
        const repriced = existing.monthlyRent !== unit.monthlyRent || existing.pricing !== unit.pricing
        Object.assign(existing, unit)
        if (wasLive && repriced) sendBackToReview(property, `Rent changed on ${existing.name}`)
        touch(property)
        return { unit: existing, backInReview: wasLive && repriced }
      }
      const created: RentalUnit = { ...unit, id: nextId(`${propertyId}-u`), propertyId }
      property.units.push(created)
      // A new unit carries a new rent; without this, adding one and deleting the old one would skip review.
      if (wasLive) sendBackToReview(property, `New unit: ${created.name}`)
      touch(property)
      return { unit: created, backInReview: wasLive }
    }, 400)
  },

  setUnitStatus(landlordId: string, propertyId: string, unitId: string, status: UnitStatus) {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      const unit = property.units.find((u) => u.id === unitId) ?? notFound("Unit")
      unit.status = status
      if (status === "occupied") unit.occupiedBeds = unit.capacity
      if (status === "available" && unit.occupiedBeds >= unit.capacity) unit.occupiedBeds = unit.capacity - 1
      property.availabilityConfirmedAt = new Date().toISOString()
      touch(property)
      return unit
    }, 200)
  },

  deleteUnit(landlordId: string, propertyId: string, unitId: string) {
    return respond(() => {
      const property = owned(landlordId, propertyId)
      // A public listing with no units would show renters a price of ₱0.
      if (property.units.length === 1 && (property.status === "active" || property.status === "pending-review")) {
        throw new ServiceError("invalid", "A listing needs at least one unit. Archive the property instead, or add another unit first.")
      }
      property.units = property.units.filter((u) => u.id !== unitId)
      touch(property)
    })
  },
}
