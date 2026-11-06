import { weeklySeries } from "@/data/moderation"
import type {
  AccountStatus,
  ActivityEvent,
  AdminMetric,
  LandlordProfile,
  ListingStatus,
  ModerationAction,
  Report,
  ReportStatus,
  User,
  UserRole,
} from "@/types"
import { toListing } from "./listings.service"
import { places } from "./locations.service"
import { isLandlordVisible } from "./visibility"
import { db } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"

export interface UserQuery {
  search?: string
  role?: UserRole | "all"
  status?: AccountStatus | "all"
  page?: number
  pageSize?: number
}

export interface Paged<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminLandlordRow {
  profile: LandlordProfile
  user: User
  propertyCount: number
  activeListings: number
  openReports: number
}

export interface ModerationItem {
  id: string
  name: string
  status: ListingStatus
  type: string
  municipality: string
  landlordName: string
  landlordId: string
  updatedAt: string
  reportCount: number
  photoSrc?: string
  isVerified: boolean
}

export interface ReportWithContext extends Report {
  listingName: string
  listingStatus: ListingStatus
  landlordName: string
  reporterName: string
}

const countBy = <T,>(list: T[], pred: (item: T) => boolean) => list.filter(pred).length

const MODERATION_RESULT: Record<ModerationAction, ListingStatus> = {
  approve: "active",
  reject: "rejected",
  suspend: "suspended",
  "request-changes": "draft",
  archive: "archived",
}

export const adminService = {
  getOverview(): Promise<{ metrics: AdminMetric[]; activity: ActivityEvent[]; queue: { listings: number; verifications: number; reports: number } }> {
    return respond(() => {
      const renters = countBy(db.users, (u) => u.role === "renter")
      const landlords = countBy(db.users, (u) => u.role === "landlord")
      const active = countBy(db.properties, (p) => p.status === "active")
      // Demo totals scale the seed data up so the dashboard reads like a live platform.
      const metrics: AdminMetric[] = [
        { id: "users", label: "Total users", value: 2400 + renters + landlords, delta: 0.14, series: weeklySeries.signups },
        { id: "renters", label: "Renters", value: 2180 + renters, delta: 0.16, series: weeklySeries.signups.map((v) => Math.round(v * 0.86)) },
        { id: "landlords", label: "Landlords", value: 230 + landlords, delta: 0.07, series: weeklySeries.signups.map((v) => Math.round(v * 0.14)) },
        { id: "listings", label: "Active listings", value: 380 + active, delta: 0.09, series: weeklySeries.newListings },
      ]
      return {
        metrics,
        activity: [...db.activity].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
        queue: {
          listings: countBy(db.properties, (p) => p.status === "pending-review"),
          verifications: countBy(db.verificationRequests, (r) => r.status === "pending"),
          reports: countBy(db.reports, (r) => r.status === "open" || r.status === "investigating"),
        },
      }
    })
  },

  getAnalytics() {
    return respond(() => {
      const byTown = db.municipalities
        .map((m) => ({
          label: m.name.replace(" City", ""),
          value: countBy(db.properties, (p) => p.status === "active" && p.address.municipalityId === m.id),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
      const byType = Object.entries(
        db.properties
          .filter((p) => p.status === "active")
          .reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + 1 }), {}),
      )
        .map(([type, value]) => ({ type, value }))
        .sort((a, b) => b.value - a.value)
      const units = db.properties.filter((p) => p.status === "active").flatMap((p) => p.units)
      const occupancy = units.reduce((s, u) => s + u.occupiedBeds, 0) / Math.max(1, units.reduce((s, u) => s + u.capacity, 0))
      return { weekly: weeklySeries, byTown, byType, occupancy, inquiryToViewing: 0.31, medianResponseHours: 4 }
    })
  },

  listUsers(query: UserQuery = {}): Promise<Paged<User>> {
    return respond(() => {
      const { search = "", role = "all", status = "all", page: requested = 1, pageSize = 8 } = query
      const q = search.trim().toLowerCase()
      const filtered = db.users
        .filter((u) => role === "all" || u.role === role)
        .filter((u) => status === "all" || u.status === status)
        .filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))
        .sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt))
      // A change can empty the last page while it's open, so step back rather than show "no results".
      const page = Math.min(requested, Math.max(1, Math.ceil(filtered.length / pageSize)))
      return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize }
    })
  },

  setUserStatus(userId: string, status: AccountStatus) {
    return respond(() => {
      const user = db.users.find((u) => u.id === userId) ?? notFound("User")
      if (user.role === "admin") throw new ServiceError("forbidden", "Admin accounts can't be changed here.")
      user.status = status
      return user
    })
  },

  listLandlords(): Promise<AdminLandlordRow[]> {
    return respond(() =>
      db.landlordProfiles.map((profile) => {
        const user = db.users.find((u) => u.id === profile.userId) ?? notFound("User")
        const owned = db.properties.filter((p) => p.landlordId === profile.id)
        const ids = new Set(owned.map((p) => p.id))
        return {
          profile,
          user,
          propertyCount: owned.length,
          activeListings: countBy(owned, (p) => p.status === "active"),
          openReports: countBy(db.reports, (r) => ids.has(r.listingId) && (r.status === "open" || r.status === "investigating")),
        }
      }),
    )
  },

  listModeration(): Promise<ModerationItem[]> {
    return respond(() =>
      db.properties
        .map((p) => {
          const landlord = db.landlordProfiles.find((l) => l.id === p.landlordId)
          return {
            id: p.id,
            name: p.name,
            status: p.status,
            type: p.type,
            municipality: places.municipalityName(p.address.municipalityId),
            landlordName: landlord?.displayName ?? "Unknown",
            landlordId: p.landlordId,
            updatedAt: p.updatedAt,
            reportCount: countBy(db.reports, (r) => r.listingId === p.id && r.status !== "dismissed" && r.status !== "resolved"),
            photoSrc: p.photos[0]?.src,
            isVerified: toListing(p).isVerified,
          }
        })
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    )
  },

  getListingForReview(id: string) {
    return respond(() => {
      const property = db.properties.find((p) => p.id === id) ?? notFound("Listing")
      return {
        listing: toListing(property),
        landlordHidden: !isLandlordVisible(property),
        reports: db.reports.filter((r) => r.listingId === id),
        verification: db.verificationRequests.filter((r) => r.propertyId === id),
      }
    })
  },

  moderate(id: string, action: ModerationAction, note?: string) {
    return respond(() => {
      const property = db.properties.find((p) => p.id === id) ?? notFound("Listing")
      property.status = MODERATION_RESULT[action]
      property.updatedAt = new Date().toISOString()
      // Kept so the landlord can see what to fix; a listing that goes live has nothing left to fix.
      property.moderationNote = action === "approve" ? undefined : note
      db.activity.unshift({
        id: `a-${Date.now()}`,
        kind: action === "approve" ? "listing-approved" : "listing-submitted",
        title: `${property.name} ${action === "approve" ? "approved" : action === "request-changes" ? "sent back for changes" : `${MODERATION_RESULT[action]}`}`,
        detail: note || "No note",
        at: new Date().toISOString(),
      })
      return property.status
    })
  },

  listReports(): Promise<ReportWithContext[]> {
    return respond(() =>
      db.reports
        .map((r) => {
          const property = db.properties.find((p) => p.id === r.listingId)
          const landlord = db.landlordProfiles.find((l) => l.id === property?.landlordId)
          return {
            ...r,
            listingName: property?.name ?? "Removed listing",
            listingStatus: property?.status ?? "archived",
            landlordName: landlord?.displayName ?? "Unknown",
            reporterName: db.users.find((u) => u.id === r.reporterId)?.name ?? "Anonymous visitor",
          }
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    )
  },

  updateReport(id: string, status: ReportStatus, resolutionNote?: string) {
    return respond(() => {
      const report = db.reports.find((r) => r.id === id) ?? notFound("Report")
      report.status = status
      if (resolutionNote) report.resolutionNote = resolutionNote
      return report
    })
  },
}
