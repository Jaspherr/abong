import { weeklySeries } from "@/data/moderation"
import {
  ACCOUNT_STATUS,
  DECISION_NOTE_MIN,
  LISTING_STATUS,
  MODERATION_ACTIONS,
  MODERATION_NEEDS_NOTE,
  REPORT_STATUS,
  REPORT_TRANSITIONS,
} from "@/constants/status"
import type {
  AccountStatus,
  ActivityEvent,
  AdminMetric,
  AuditArea,
  AuditEntry,
  LandlordProfile,
  ListingStatus,
  ModerationAction,
  Report,
  ReportStatus,
  User,
  UserRole,
} from "@/types"
import { recordDecision, requireNote } from "./audit"
import { toListing } from "./listings.service"
import { places } from "./locations.service"
import { isLandlordVisible } from "./visibility"
import { db, nextId } from "./mock/db"
import { ServiceError, notFound, respond } from "./mock/latency"
import { requireAdmin } from "./mock/session"

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

const DAY_MS = 86_400_000
/** Whether a date falls in the last 30 days. */
const isRecent = (iso: string, now: number) => now - Date.parse(iso) <= 30 * DAY_MS

export interface AuditQuery {
  area?: AuditArea | "all"
  page?: number
  pageSize?: number
}

const ACTION_DONE: Record<ModerationAction, string> = {
  approve: "Approved listing",
  reject: "Rejected listing",
  suspend: "Suspended listing",
  "request-changes": "Asked for changes",
  archive: "Archived listing",
}

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
      requireAdmin()
      // Counted from the records themselves, so the numbers move when the data does.
      const now = Date.now()
      const people = db.users.filter((u) => u.role !== "admin")
      const metric = (id: string, label: string, dates: string[]): AdminMetric => ({
        id,
        label,
        value: dates.length,
        recent: countBy(dates, (at) => isRecent(at, now)),
      })
      const metrics: AdminMetric[] = [
        metric("users", "Renters and landlords", people.map((u) => u.joinedAt)),
        metric("renters", "Renters", people.filter((u) => u.role === "renter").map((u) => u.joinedAt)),
        metric("landlords", "Landlords", people.filter((u) => u.role === "landlord").map((u) => u.joinedAt)),
        metric("listings", "Active listings", db.properties.filter((p) => p.status === "active").map((p) => p.createdAt)),
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
      requireAdmin()
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
      requireAdmin()
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

  /**
   * Suspends or reactivates an account. Suspending needs a reason, kept on the account and
   * in the audit log. Admin accounts, including the caller's own, can't be changed here.
   */
  setUserStatus(userId: string, status: Extract<AccountStatus, "active" | "suspended">, reason?: string) {
    return respond(() => {
      const admin = requireAdmin()
      const user = db.users.find((u) => u.id === userId) ?? notFound("User")
      if (user.role === "admin") throw new ServiceError("forbidden", "Admin accounts can't be changed here.")
      if (user.status === status) {
        throw new ServiceError("invalid", `This account is already ${ACCOUNT_STATUS[status].label.toLowerCase()}.`)
      }
      const note =
        status === "suspended"
          ? requireNote(reason, DECISION_NOTE_MIN, "Give a reason for the suspension, at least 10 characters.")
          : reason?.trim() || undefined

      const from = user.status
      user.status = status
      user.statusReason = status === "suspended" ? note : undefined
      recordDecision(admin, {
        area: "account",
        targetId: user.id,
        targetLabel: user.name,
        action: status === "suspended" ? "Suspended account" : "Reactivated account",
        from: ACCOUNT_STATUS[from].label,
        to: ACCOUNT_STATUS[status].label,
        note,
      })
      return user
    })
  },

  listLandlords(): Promise<AdminLandlordRow[]> {
    return respond(() => {
      requireAdmin()
      return db.landlordProfiles.map((profile) => {
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
      })
    })
  },

  listModeration(): Promise<ModerationItem[]> {
    return respond(() => {
      requireAdmin()
      return db.properties
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
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    })
  },

  getListingForReview(id: string) {
    return respond(() => {
      requireAdmin()
      const property = db.properties.find((p) => p.id === id) ?? notFound("Listing")
      return {
        listing: toListing(property),
        landlordHidden: !isLandlordVisible(property),
        reports: db.reports.filter((r) => r.listingId === id),
        verification: db.verificationRequests.filter((r) => r.propertyId === id),
      }
    })
  },

  /**
   * Applies a moderation decision. Only the decisions allowed from the listing's current
   * status go through, and the ones the landlord has to act on need a note.
   */
  moderate(id: string, action: ModerationAction, note?: string) {
    return respond(() => {
      const admin = requireAdmin()
      const property = db.properties.find((p) => p.id === id) ?? notFound("Listing")
      if (!MODERATION_ACTIONS[property.status].includes(action)) {
        throw new ServiceError(
          "invalid",
          `A listing that's ${LISTING_STATUS[property.status].label.toLowerCase()} can't be changed that way. Reload to see where it stands.`,
        )
      }
      const cleanNote = MODERATION_NEEDS_NOTE.includes(action)
        ? requireNote(note, DECISION_NOTE_MIN, "Add a note of at least 10 characters so the landlord knows what to fix.")
        : note?.trim() || undefined

      const from = property.status
      const now = new Date().toISOString()
      property.status = MODERATION_RESULT[action]
      property.updatedAt = now
      // Kept so the landlord can see what to fix; a listing that goes live has nothing left to fix.
      property.moderationNote = action === "approve" ? undefined : cleanNote
      recordDecision(admin, {
        area: "listing",
        targetId: property.id,
        targetLabel: property.name,
        action: ACTION_DONE[action],
        from: LISTING_STATUS[from].label,
        to: LISTING_STATUS[property.status].label,
        note: cleanNote,
      })
      db.activity.unshift({
        id: nextId("a"),
        kind: action === "approve" ? "listing-approved" : "listing-moderated",
        title: `${property.name}: ${ACTION_DONE[action].toLowerCase()}`,
        detail: cleanNote ?? `By ${admin.name}`,
        at: now,
        href: `/admin/listings?review=${property.id}`,
      })
      return property.status
    })
  },

  listReports(): Promise<ReportWithContext[]> {
    return respond(() => {
      requireAdmin()
      return db.reports
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
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    })
  },

  /** Moves a report on. Closing it, as resolved or dismissed, needs a note saying why. */
  updateReport(id: string, status: ReportStatus, resolutionNote?: string) {
    return respond(() => {
      const admin = requireAdmin()
      const report = db.reports.find((r) => r.id === id) ?? notFound("Report")
      if (!REPORT_TRANSITIONS[report.status].includes(status)) {
        throw new ServiceError(
          "invalid",
          `This report is already ${REPORT_STATUS[report.status].label.toLowerCase()}. Reload to see where it stands.`,
        )
      }
      const closing = status === "resolved" || status === "dismissed"
      const note = closing
        ? requireNote(resolutionNote, DECISION_NOTE_MIN, "Add a note of at least 10 characters saying what you found.")
        : resolutionNote?.trim() || undefined

      const from = report.status
      report.status = status
      if (closing) report.resolutionNote = note
      const listing = db.properties.find((p) => p.id === report.listingId)
      recordDecision(admin, {
        area: "report",
        targetId: report.id,
        targetLabel: `Report on ${listing?.name ?? "a removed listing"}`,
        action: status === "investigating" ? "Started investigating" : status === "resolved" ? "Resolved report" : "Dismissed report",
        from: REPORT_STATUS[from].label,
        to: REPORT_STATUS[status].label,
        note,
      })
      return report
    })
  },

  /** The audit log, newest first, one page at a time. */
  listAudit(query: AuditQuery = {}): Promise<Paged<AuditEntry>> {
    return respond(() => {
      requireAdmin()
      const { area = "all", page: requested = 1, pageSize = 20 } = query
      const filtered = db.auditLog.filter((e) => area === "all" || e.area === area)
      const page = Math.min(requested, Math.max(1, Math.ceil(filtered.length / pageSize)))
      return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize }
    })
  },

  /** Every decision recorded about these records, newest first. */
  getHistory(targetIds: string[]): Promise<AuditEntry[]> {
    return respond(() => {
      requireAdmin()
      const ids = new Set(targetIds)
      return db.auditLog.filter((e) => ids.has(e.targetId))
    })
  },
}
