import { useEffect } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router"

/** Moves focus to the main region on navigation so screen-reader users hear the new page. */
function useRouteFocus() {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.getElementById("main")
    if (!main) return
    main.setAttribute("tabindex", "-1")
    main.focus({ preventScroll: true })
  }, [pathname])
}

export function RootLayout() {
  useRouteFocus()
  return (
    <>
      <Outlet />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  )
}
