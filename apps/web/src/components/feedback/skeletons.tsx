import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ListingCardSkeleton({ layout = "vertical" }: { layout?: "vertical" | "horizontal" }) {
  if (layout === "horizontal") {
    return (
      <div className="flex gap-4 rounded-2xl bg-card p-3 shadow-card" aria-hidden="true">
        <Skeleton className="aspect-[4/3] w-40 shrink-0 rounded-xl sm:w-56" />
        <div className="flex flex-1 flex-col gap-2.5 py-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-auto h-6 w-28" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-28" />
    </div>
  )
}

export function ListingGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border" role="status" aria-label="Loading table">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-9 rounded-full" />
          {Array.from({ length: columns - 1 }, (_, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-40" : "hidden w-20 sm:block")} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="container-page py-6" role="status" aria-label="Loading listing">
      <Skeleton className="h-4 w-48" />
      <div className="mt-5 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <Skeleton className="aspect-[4/3] rounded-2xl sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="hidden aspect-[4/3] rounded-2xl sm:block" />
        ))}
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="hidden h-80 rounded-2xl lg:block" />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading page">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
