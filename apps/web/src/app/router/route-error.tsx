import { Link, isRouteErrorResponse, useRouteError } from "react-router"
import { LogoMark } from "@/components/common/logo"
import { Button } from "@/components/ui/button"

/** Last-resort boundary for render errors and failed chunk loads. */
export function RouteError() {
  const error = useRouteError()
  const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script/i.test(error.message)
  const status = isRouteErrorResponse(error) ? error.status : null

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <LogoMark className="size-10" />
        <h1 className="type-page-title">
          {chunkFailed ? "A new version is available" : status === 404 ? "Page not found" : "This page hit a problem"}
        </h1>
        <p className="text-muted-foreground">
          {chunkFailed
            ? "Reload to get the latest version of Abong."
            : "Reload the page. If it keeps happening, go back to the homepage and try again."}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="outline" asChild>
            <Link to="/">Go to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
