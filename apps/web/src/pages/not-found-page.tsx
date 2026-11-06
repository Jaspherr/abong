import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { useDocumentTitle } from "@/hooks/use-document-title"

function NotFoundPage() {
  useDocumentTitle("Page not found")
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <svg viewBox="0 0 120 120" className="size-32" aria-hidden="true">
          <rect x="10" y="10" width="100" height="100" rx="16" fill="var(--secondary)" />
          <path d="M38 98V58a22 22 0 0 1 44 0v40Z" fill="var(--card)" stroke="var(--brand-green)" strokeWidth="3" />
          <path d="M52 98V66a8 8 0 0 1 16 0v32Z" fill="var(--brand-tint-deep)" />
        </svg>
        <h1 className="mt-6 type-page-title">This door doesn't lead anywhere</h1>
        <p className="mt-3 text-muted-foreground">The page may have moved, or the listing may have been taken down. Search again from the homepage.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to={PATHS.search}>Search places</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={PATHS.home}>Go to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export { NotFoundPage as Component }
