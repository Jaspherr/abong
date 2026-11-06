import { Outlet } from "react-router"

/** Signed-in account pages for renters and landlords: page width and top spacing under the site header. */
export function AccountLayout() {
  return (
    <div className="container-page pt-6 pb-4 sm:pt-8">
      <Outlet />
    </div>
  )
}
