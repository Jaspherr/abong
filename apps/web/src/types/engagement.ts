export interface Favorite {
  listingId: string
  savedAt: string
}

export interface Message {
  id: string
  senderId: string
  body: string
  sentAt: string
  /** Sent by the system, not typed by a person. Never counted as a landlord's response. */
  automated?: boolean
}

export type InquiryStatus = "open" | "closed"

export interface Inquiry {
  id: string
  listingId: string
  unitId?: string
  renterId: string
  landlordId: string
  messages: Message[]
  status: InquiryStatus
  unreadForRenter: number
  unreadForLandlord: number
  createdAt: string
  updatedAt: string
}

export type ViewingStatus = "pending" | "confirmed" | "declined" | "completed" | "cancelled"

export interface ViewingRequest {
  id: string
  listingId: string
  unitId?: string
  renterId: string
  landlordId: string
  /** ISO date (yyyy-MM-dd). */
  date: string
  /** 24h time, e.g. "14:00". */
  time: string
  message?: string
  status: ViewingStatus
  landlordNote?: string
  createdAt: string
  updatedAt: string
}

export type NotificationKind = "inquiry" | "viewing" | "verification" | "listing" | "rental" | "review" | "system"

export interface Notification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  createdAt: string
  read: boolean
}

/**
 * A renter living at a property, confirmed by both sides. Abong records that the stay
 * happened and when; it isn't a lease, and holds no contract, ID or payment details.
 *
 * Stored status:
 * - "pending": one side proposed it and the other hasn't answered.
 * - "confirmed": both sides agree. Whether it's upcoming or current comes from the dates.
 * - "ended": the renter moved out.
 * - "declined" / "cancelled": refused by the other side, or withdrawn by the one who proposed it.
 * - "disputed": one side says it's wrong; an admin decides. Reviews from it are held meanwhile.
 * - "void": an admin found it wasn't genuine. Reviews from it are removed from view.
 */
export type RentalStatus = "pending" | "confirmed" | "ended" | "declined" | "cancelled" | "disputed" | "void"

/** What a rental means for the renter right now, worked out from status and dates. */
export type RentalPhase = "pending" | "upcoming" | "current" | "past" | "closed" | "disputed"

export interface RentalDispute {
  openedBy: string
  reason: string
  openedAt: string
  /** The status to return to if an admin keeps the rental. */
  previousStatus: "confirmed" | "ended"
}

export interface Rental {
  id: string
  renterId: string
  /** Landlord profile id, as on listings, inquiries and viewings. */
  landlordId: string
  listingId: string
  unitId?: string
  /** ISO date (yyyy-MM-dd) the renter moved in, or will. */
  startDate: string
  /** ISO date the renter moved out. Set when the rental ends. */
  endDate?: string
  proposedBy: "renter" | "landlord"
  status: RentalStatus
  /** Kept as they were, so history still reads correctly if the listing is renamed or archived. */
  propertyName: string
  unitName?: string
  dispute?: RentalDispute
  confirmedAt?: string
  createdAt: string
  updatedAt: string
}

export type ReviewKind = "viewing" | "residence"

/** Aspects a renter can rate after a viewing. Maintenance and day-to-day living are left out on purpose. */
export type ViewingAspect = "reliability" | "punctuality" | "communication" | "accuracy"

/** Aspects only someone who lived there can rate. */
export type ResidenceAspect = "communication" | "accuracy" | "maintenance" | "professionalism"

export type ReviewAspect = ViewingAspect | ResidenceAspect

/**
 * - "published": public.
 * - "held": its rental is disputed; hidden until an admin decides.
 * - "hidden": an admin removed it for breaking the review rules.
 * - "withdrawn": the author deleted it. Text and ratings are erased; the record stays so the
 *   same stay or viewing can't be reviewed again, which would let a reported review be replaced.
 */
export type ReviewStatus = "published" | "held" | "hidden" | "withdrawn"

export interface LandlordResponse {
  body: string
  createdAt: string
  updatedAt?: string
}

export interface Review {
  id: string
  kind: ReviewKind
  /** The rental or viewing that made the renter eligible. One review per source. */
  sourceId: string
  authorId: string
  landlordId: string
  listingId: string
  /** 1–5. For a stay, the overall rental experience; for a viewing, the overall visit. */
  overall: number
  /** Optional 1–5 per aspect; left out when the renter didn't experience it. */
  aspects: Partial<Record<ReviewAspect, number>>
  /** Residence reviews only: would they recommend living here. */
  recommend?: boolean
  body?: string
  status: ReviewStatus
  /** Kept as they were when the review was written. */
  propertyName: string
  createdAt: string
  editedAt?: string
  withdrawnAt?: string
  response?: LandlordResponse
}

export type ReviewReportReason = "false-information" | "personal-information" | "harassment" | "not-genuine" | "other"

export type ReviewReportStatus = "open" | "upheld" | "dismissed"

export interface ReviewReport {
  id: string
  reviewId: string
  reporterId: string
  reason: ReviewReportReason
  details?: string
  status: ReviewReportStatus
  createdAt: string
  resolutionNote?: string
}
