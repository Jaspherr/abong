import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { History } from "lucide-react"
import { useState } from "react"
import { LineTabs } from "@/components/common/line-tabs"
import { Pagination } from "@/components/common/pagination"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { TableSkeleton } from "@/components/feedback/skeletons"
import { AUDIT_AREAS } from "@/constants/status"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { AuditEntryText } from "@/features/admin/decision-history"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatNumber } from "@/lib/format"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { adminService } from "@/services"
import type { AuditArea } from "@/types"

type Filter = AuditArea | "all"

const PAGE_SIZE = 20

/**
 * Every admin decision, newest first: who made it, when, what changed and why. Read-only;
 * entries are written by the services as decisions are made and are never edited.
 */
function AuditPage() {
  useDocumentTitle("Audit log")
  const [area, setArea] = useState<Filter>("all")
  const [page, setPage] = useState(1)

  const query = { area, page, pageSize: PAGE_SIZE }
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: qk.admin.audit(query),
    queryFn: () => adminService.listAudit(query),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="w-full space-y-4 pb-10">
      <AdminPageHeader
        title="Audit log"
        description="Every moderation, verification, report and account decision, with who made it and why. Decisions made in this demo are kept in this browser."
        metric={
          <HeaderMetric
            loading={isPending}
            value={isError ? "—" : formatNumber(data?.total ?? 0)}
            label={area === "all" ? "Decisions recorded" : `${AUDIT_AREAS[area]} decisions`}
          />
        }
      />

      <LineTabs
        label="Filter decisions"
        value={area}
        onChange={(next) => {
          setArea(next)
          setPage(1)
        }}
        tabs={[
          { value: "all", label: "All" },
          ...(Object.keys(AUDIT_AREAS) as AuditArea[]).map((value) => ({ value, label: AUDIT_AREAS[value] })),
        ]}
      />

      <section aria-label="Decisions" aria-busy={isFetching} className="min-w-0">
        {isPending ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.rows.length === 0 ? (
          <div className="border-b border-border/80 py-8">
            <EmptyState
              compact
              icon={History}
              title={area === "all" ? "No decisions yet" : `No ${AUDIT_AREAS[area].toLowerCase()} decisions yet`}
              description="Approvals, rejections, suspensions and report outcomes appear here as they're made."
            />
          </div>
        ) : (
          <>
            <ol className={cn("divide-y divide-border/70 border-b border-border/80 transition-opacity", isFetching && "opacity-60")}>
              {data.rows.map((entry) => (
                <li key={entry.id} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                  <p className="text-caption font-medium text-muted-foreground sm:pt-0.5">{AUDIT_AREAS[entry.area]}</p>
                  <div className="min-w-0">
                    <AuditEntryText entry={entry} showTarget />
                  </div>
                </li>
              ))}
            </ol>
            <div className="pt-2">
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export { AuditPage as Component }
