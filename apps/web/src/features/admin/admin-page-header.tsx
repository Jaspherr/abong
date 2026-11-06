import type { ReactNode } from "react"
import { PageHeader } from "@/components/common/page-header"
import { Skeleton } from "@/components/ui/skeleton"

/** Admin pages lead with the task and one number that says how much of it is left. */
export function AdminPageHeader({
  title,
  description,
  metric,
}: {
  title: string
  description: ReactNode
  metric?: ReactNode
}) {
  return <PageHeader title={title} description={description} actions={metric} className="border-b border-border pb-5" />
}

export function HeaderMetric({
  value,
  label,
  detail,
  loading,
}: {
  value: string
  label: string
  detail?: string
  loading?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 sm:flex-col sm:items-end sm:gap-0.5 sm:text-right" aria-live="polite">
      {loading ? <Skeleton className="h-7 w-12 rounded-md" /> : <span className="font-display text-metric">{value}</span>}
      <span className="text-meta font-medium">{label}</span>
      {detail && <span className="w-full text-caption text-muted-foreground">{detail}</span>}
    </div>
  )
}
