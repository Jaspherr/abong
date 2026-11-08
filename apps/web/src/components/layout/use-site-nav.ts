import { useQuery } from "@tanstack/react-query"
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  Flag,
  Gauge,
  GraduationCap,
  Heart,
  History,
  LayoutList,
  MessageSquare,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { useFavoriteIds } from "@/features/favorites/use-favorites"
import { qk } from "@/lib/query"
import { adminService, inquiriesService, verificationService, viewingsService } from "@/services"
import type { UserRole } from "@/types"

export interface SiteNavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Items needing attention; shown as a badge when above zero. */
  count?: number
  /** What the count means, read to screen readers after the number. */
  countLabel?: string
  /** Kept out of the desktop bar to save room; still in the mobile menu. */
  compact?: boolean
  end?: boolean
}

export interface SiteNavGroup {
  /** "browse" is the public site; "account" is the signed-in person's own area. */
  id: "browse" | "account"
  label: string
  items: SiteNavItem[]
}

const FIND = { to: PATHS.search, label: "Find a place", icon: Search }
const NEAR_SCHOOLS = { to: PATHS.schools, label: "Near schools", icon: GraduationCap }

/** Unread and pending counts for whoever is signed in. Each query only runs for its own role. */
function useAttentionCounts(role: UserRole | undefined) {
  const { session } = useAuth()
  const userId = session?.user.id ?? ""
  const landlordId = session?.landlordProfile?.id ?? ""
  const isRenter = role === "renter" && Boolean(userId)
  const isLandlord = role === "landlord" && Boolean(landlordId)

  const renterInquiries = useQuery({
    queryKey: qk.renterInquiries(userId),
    queryFn: () => inquiriesService.listForRenter(userId),
    enabled: isRenter,
  })
  const landlordInquiries = useQuery({
    queryKey: qk.landlordInquiries(landlordId),
    queryFn: () => inquiriesService.listForLandlord(landlordId),
    enabled: isLandlord,
  })
  const landlordViewings = useQuery({
    queryKey: qk.landlordViewings(landlordId),
    queryFn: () => viewingsService.listForLandlord(landlordId),
    enabled: isLandlord,
  })
  // Live, not from the session: the session is a snapshot from sign-in and would keep showing old steps.
  const verification = useQuery({
    queryKey: qk.verification(landlordId),
    queryFn: () => verificationService.getForLandlord(landlordId),
    enabled: isLandlord,
  })
  const admin = useQuery({ queryKey: qk.admin.overview, queryFn: adminService.getOverview, enabled: role === "admin" })

  const verifications = verification.data?.statuses
  return {
    renterUnread: renterInquiries.data?.filter((i) => i.unreadForRenter > 0).length ?? 0,
    landlordUnread: landlordInquiries.data?.filter((i) => i.unreadForLandlord > 0).length ?? 0,
    landlordPendingViewings: landlordViewings.data?.filter((v) => v.status === "pending").length ?? 0,
    landlordVerificationTodo: verifications
      ? Object.values(verifications).filter((s) => s !== "verified" && s !== "pending").length
      : 0,
    adminQueue: admin.data?.queue ?? { listings: 0, verifications: 0, reports: 0 },
  }
}

/** Navigation for the public header, shaped by who is signed in. */
export function useSiteNav(): SiteNavGroup[] {
  const { user } = useAuth()
  const saved = useFavoriteIds().size
  const c = useAttentionCounts(user?.role)

  if (!user) {
    return [
      {
        id: "browse",
        label: "Browse",
        items: [FIND, NEAR_SCHOOLS, { to: "/for-landlords", label: "For landlords", icon: Store }],
      },
    ]
  }

  if (user.role === "renter") {
    return [
      { id: "browse", label: "Browse", items: [FIND, NEAR_SCHOOLS] },
      {
        id: "account",
        label: "Your rentals",
        items: [
          { to: PATHS.favorites, label: "Saved", icon: Heart, count: saved, countLabel: "saved" },
          { to: PATHS.inquiries, label: "Inquiries", icon: MessageSquare, count: c.renterUnread, countLabel: "unread" },
          { to: PATHS.viewings, label: "Viewings", icon: CalendarDays },
          { to: PATHS.profile, label: "Profile", icon: UserRound, compact: true },
        ],
      },
    ]
  }

  if (user.role === "landlord") {
    return [
      { id: "browse", label: "Browse", items: [FIND] },
      {
        id: "account",
        label: "Your properties",
        items: [
          { to: PATHS.landlord.dashboard, label: "Dashboard", icon: Gauge },
          { to: PATHS.landlord.properties, label: "Properties", icon: Building2 },
          { to: PATHS.landlord.listings, label: "Listings", icon: LayoutList },
          { to: PATHS.landlord.inquiries, label: "Inquiries", icon: MessageSquare, count: c.landlordUnread, countLabel: "unread" },
          {
            to: PATHS.landlord.viewings,
            label: "Viewings",
            icon: CalendarDays,
            count: c.landlordPendingViewings,
            countLabel: "waiting for a reply",
          },
          {
            to: PATHS.landlord.verification,
            label: "Verification",
            icon: BadgeCheck,
            count: c.landlordVerificationTodo,
            countLabel: "to do",
            compact: true,
          },
          { to: PATHS.landlord.profile, label: "Profile", icon: UserRound, compact: true },
        ],
      },
    ]
  }

  return [
    { id: "browse", label: "Browse", items: [FIND] },
    {
      id: "account",
      label: "Admin",
      items: [
        { to: PATHS.admin.overview, label: "Overview", icon: Gauge, end: true },
        { to: PATHS.admin.listings, label: "Moderation", icon: LayoutList, count: c.adminQueue.listings, countLabel: "to review" },
        {
          to: PATHS.admin.verifications,
          label: "Verifications",
          icon: ShieldCheck,
          count: c.adminQueue.verifications,
          countLabel: "to review",
        },
        { to: PATHS.admin.reports, label: "Reports", icon: Flag, count: c.adminQueue.reports, countLabel: "open" },
        { to: PATHS.admin.users, label: "Users", icon: Users },
        { to: PATHS.admin.landlords, label: "Landlords", icon: UsersRound, compact: true },
        { to: PATHS.admin.analytics, label: "Analytics", icon: BarChart3, compact: true },
        { to: PATHS.admin.audit, label: "Audit log", icon: History, compact: true },
        { to: PATHS.admin.profile, label: "Profile", icon: UserRound, compact: true },
      ],
    },
  ]
}
