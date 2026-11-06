import { Navigate, createBrowserRouter, type RouteObject } from "react-router"
import { AccountLayout } from "@/app/layouts/account-layout"
import { AuthLayout } from "@/app/layouts/auth-layout"
import { AuthSplitLayout } from "@/app/layouts/auth-split-layout"
import { AdminLayout } from "@/app/layouts/admin-layout"
import { PublicLayout } from "@/app/layouts/public-layout"
import { RootLayout } from "@/app/layouts/root-layout"
import { PageLoader } from "@/components/feedback/skeletons"
import { RequireRole } from "@/features/auth/require-role"
import { RouteError } from "./route-error"

/** Each page is its own chunk; modules export `Component` per React Router's lazy convention. */
const page = (load: () => Promise<{ Component: React.ComponentType }>) => ({ lazy: load })

const publicRoutes: RouteObject[] = [
  { index: true, ...page(() => import("@/pages/public/home-page")) },
  { path: "listing/:id", ...page(() => import("@/pages/public/listing-page")) },
  { path: "landlord/:id", ...page(() => import("@/pages/public/landlord-profile-page")) },
  { path: "near", ...page(() => import("@/pages/public/schools-page")) },
  { path: "near/:slug", ...page(() => import("@/pages/public/university-page")) },
  { path: "for-landlords", ...page(() => import("@/pages/public/for-landlords-page")) },
  { path: "safety", ...page(() => import("@/pages/public/safety-page")) },
  {
    Component: AccountLayout,
    children: [
      { path: "favorites", ...page(() => import("@/pages/renter/favorites-page")) },
      {
        element: <RequireRole role="renter" />,
        children: [
          { path: "inquiries", ...page(() => import("@/pages/renter/inquiries-page")) },
          { path: "viewings", ...page(() => import("@/pages/renter/viewings-page")) },
          { path: "profile", ...page(() => import("@/pages/renter/profile-page")) },
        ],
      },
    ],
  },
  { path: "*", ...page(() => import("@/pages/not-found-page")) },
]

const landlordRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: "dashboard", ...page(() => import("@/pages/landlord/dashboard-page")) },
  { path: "properties", ...page(() => import("@/pages/landlord/properties-page")) },
  { path: "properties/new", ...page(() => import("@/pages/landlord/property-new-page")) },
  { path: "properties/:id", ...page(() => import("@/pages/landlord/property-detail-page")) },
  { path: "listings", ...page(() => import("@/pages/landlord/listings-page")) },
  { path: "inquiries", ...page(() => import("@/pages/landlord/inquiries-page")) },
  { path: "viewings", ...page(() => import("@/pages/landlord/viewings-page")) },
  { path: "verification", ...page(() => import("@/pages/landlord/verification-page")) },
  { path: "profile", ...page(() => import("@/pages/landlord/profile-page")) },
]

const adminRoutes: RouteObject[] = [
  { index: true, ...page(() => import("@/pages/admin/overview-page")) },
  { path: "users", ...page(() => import("@/pages/admin/users-page")) },
  { path: "landlords", ...page(() => import("@/pages/admin/landlords-page")) },
  { path: "listings", ...page(() => import("@/pages/admin/listings-page")) },
  { path: "verifications", ...page(() => import("@/pages/admin/verifications-page")) },
  { path: "reports", ...page(() => import("@/pages/admin/reports-page")) },
  { path: "analytics", ...page(() => import("@/pages/admin/analytics-page")) },
  { path: "profile", ...page(() => import("@/pages/admin/profile-page")) },
]

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    // Shown while the first lazy route module loads.
    HydrateFallback: PageLoader,
    errorElement: <RouteError />,
    children: [
      { path: "/", Component: PublicLayout, children: publicRoutes },
      {
        // Search is a full-height list + map workspace, so it skips the footer.
        path: "/search",
        element: <PublicLayout footer={false} />,
        children: [{ index: true, ...page(() => import("@/pages/public/search-page")) }],
      },
      {
        Component: AuthSplitLayout,
        children: [
          { path: "/login", ...page(() => import("@/pages/auth/login-page")) },
          { path: "/register", ...page(() => import("@/pages/auth/register-page")) },
        ],
      },
      {
        Component: AuthLayout,
        children: [{ path: "/forgot-password", ...page(() => import("@/pages/auth/forgot-password-page")) }],
      },
      {
        path: "/landlord",
        element: <RequireRole role="landlord" />,
        // Same header and canvas as renters, without the marketplace footer: this is where landlords work.
        children: [{ element: <PublicLayout footer={false} />, children: [{ Component: AccountLayout, children: landlordRoutes }] }],
      },
      {
        path: "/admin",
        element: <RequireRole role="admin" />,
        children: [{ Component: AdminLayout, children: adminRoutes }],
      },
    ],
  },
])
