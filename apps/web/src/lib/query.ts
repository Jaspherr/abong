import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => count < 1 && !(error instanceof Error && error.name === "ServiceError"),
    },
  },
})

/** Central query keys so invalidation stays consistent between features. */
export const qk = {
  search: (filters: object) => ["listings", "search", filters] as const,
  listing: (id: string) => ["listings", "detail", id] as const,
  listingsMany: (ids: string[]) => ["listings", "many", ids] as const,
  featured: ["listings", "featured"] as const,
  similar: (id: string) => ["listings", "similar", id] as const,
  nearby: (id: string) => ["listings", "nearby", id] as const,
  municipalities: ["places", "municipalities"] as const,
  universities: ["places", "universities"] as const,
  university: (slug: string) => ["places", "university", slug] as const,
  landlord: (id: string) => ["landlords", id] as const,
  landlordMe: (userId: string) => ["landlords", "me", userId] as const,
  favorites: ["favorites"] as const,
  renterInquiries: (userId: string) => ["inquiries", "renter", userId] as const,
  landlordInquiries: (landlordId: string) => ["inquiries", "landlord", landlordId] as const,
  renterViewings: (userId: string) => ["viewings", "renter", userId] as const,
  landlordViewings: (landlordId: string) => ["viewings", "landlord", landlordId] as const,
  landlordProperties: (landlordId: string) => ["properties", landlordId] as const,
  landlordProperty: (landlordId: string, id: string) => ["properties", landlordId, id] as const,
  verification: (landlordId: string) => ["verification", landlordId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  admin: {
    overview: ["admin", "overview"] as const,
    analytics: ["admin", "analytics"] as const,
    users: (query: object) => ["admin", "users", query] as const,
    landlords: ["admin", "landlords"] as const,
    moderation: ["admin", "moderation"] as const,
    review: (id: string) => ["admin", "review", id] as const,
    verifications: ["admin", "verifications"] as const,
    reports: ["admin", "reports"] as const,
    audit: (query: object) => ["admin", "audit", query] as const,
    history: (ids: string[]) => ["admin", "history", ids] as const,
  },
}
