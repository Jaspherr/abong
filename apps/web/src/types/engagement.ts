export interface Favorite {
  listingId: string
  savedAt: string
}

export interface Message {
  id: string
  senderId: string
  body: string
  sentAt: string
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

export type NotificationKind = "inquiry" | "viewing" | "verification" | "listing" | "system"

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
