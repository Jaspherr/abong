import type { LandlordProfile, User } from "@/types"
import { toListing } from "./listings.service"
import { db } from "./mock/db"
import { notFound, respond } from "./mock/latency"
import { isPublic } from "./visibility"

export interface PublicLandlord {
  profile: LandlordProfile
  user: Pick<User, "id" | "name" | "lastActiveAt">
  listings: ReturnType<typeof toListing>[]
  stats: { activeListings: number; totalUnits: number; availableUnits: number }
}

export const landlordsService = {
  getPublicProfile(id: string): Promise<PublicLandlord> {
    return respond(() => {
      const profile = db.landlordProfiles.find((l) => l.id === id)
      const user = profile && db.users.find((u) => u.id === profile.userId)
      if (!profile || !user) notFound("Landlord")
      const listings = db.properties
        .filter((p) => p.landlordId === id && isPublic(p))
        .map((p) => toListing(p))
      return {
        profile,
        user: { id: user.id, name: user.name, lastActiveAt: user.lastActiveAt },
        listings,
        stats: {
          activeListings: listings.length,
          totalUnits: listings.reduce((s, l) => s + l.totalUnitCount, 0),
          availableUnits: listings.reduce((s, l) => s + l.availableUnitCount, 0),
        },
      }
    })
  },

  getProfileByUser(userId: string): Promise<LandlordProfile> {
    return respond(() => db.landlordProfiles.find((l) => l.userId === userId) ?? notFound("Landlord profile"))
  },

  updateProfile(id: string, patch: Partial<Pick<LandlordProfile, "displayName" | "businessName" | "bio" | "languages">>) {
    return respond(() => {
      const profile = db.landlordProfiles.find((l) => l.id === id) ?? notFound("Landlord profile")
      Object.assign(profile, patch)
      return profile
    })
  },
}
