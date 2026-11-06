/** Brand values kept in one place so the temporary identity is easy to replace. */
export const BRAND = {
  name: "Abong",
  tagline: "Long-term rentals across Pangasinan",
  meaning: "“Abong” is Pangasinan for house.",
  supportEmail: "help@abong.ph",
} as const

/** Demo helpers (role switcher, demo sign-in) are on unless explicitly disabled. */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false"

export const PATHS = {
  home: "/",
  search: "/search",
  listing: (id: string) => `/listing/${id}`,
  landlordProfile: (id: string) => `/landlord/${id}`,
  schools: "/near",
  near: (slug: string) => `/near/${slug}`,
  favorites: "/favorites",
  inquiries: "/inquiries",
  viewings: "/viewings",
  profile: "/profile",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  landlord: {
    dashboard: "/landlord/dashboard",
    properties: "/landlord/properties",
    newProperty: "/landlord/properties/new",
    property: (id: string) => `/landlord/properties/${id}`,
    listings: "/landlord/listings",
    inquiries: "/landlord/inquiries",
    viewings: "/landlord/viewings",
    verification: "/landlord/verification",
    profile: "/landlord/profile",
  },
  admin: {
    overview: "/admin",
    users: "/admin/users",
    landlords: "/admin/landlords",
    profile: "/admin/profile",
    listings: "/admin/listings",
    verifications: "/admin/verifications",
    reports: "/admin/reports",
    analytics: "/admin/analytics",
  },
} as const

export const VIEWING_TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"] as const
