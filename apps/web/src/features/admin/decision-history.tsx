import { useQuery } from "@tanstack/react-query"
import { formatDate, formatRelative } from "@/lib/format"
import { qk } from "@/lib/query"
import { adminService } from "@/services"
import type { AuditEntry } from "@/types"

/** One recorded decision: what was done, by whom and when, the status change, and the note. */
export function AuditEntryText({ entry, showTarget }: { entry: AuditEntry; showTarget?: boolean }) {
  return (
    <>
      <p className="text-sm">
        <span className="font-medium">{entry.action}</span>
        {showTarget && <span className="text-muted-foreground">: {entry.targetLabel}</span>}
      </p>
      <p className="mt-0.5 text-meta text-muted-foreground">
        {entry.actorName}, <time dateTime={entry.at} title={formatDate(entry.at, "MMM d, yyyy 'at' h:mm a")}>{formatRelative(entry.at)}</time>
        {entry.from && entry.to && entry.from !== entry.to && `. ${entry.from} to ${entry.to}`}
      </p>
      {entry.note && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{entry.note}</p>}
    </>
  )
}

/**
 * The decisions recorded about a record, newest first, so whoever picks it up next can
 * see what was already decided and why. Shows nothing until there's something to show.
 */
export function DecisionHistory({ targetIds, title = "Decision history" }: { targetIds: string[]; title?: string }) {
  const { data, isError } = useQuery({
    queryKey: qk.admin.history(targetIds),
    queryFn: () => adminService.getHistory(targetIds),
  })

  if (isError) {
    return <p className="border-t border-border pt-5 text-sm text-muted-foreground">Decision history couldn't be loaded.</p>
  }
  if (!data || data.length === 0) return null

  return (
    <section className="space-y-3 border-t border-border pt-5">
      <h3 className="font-sans text-sm font-semibold">{title}</h3>
      <ol className="space-y-3">
        {data.map((entry) => (
          <li key={entry.id}>
            <AuditEntryText entry={entry} />
          </li>
        ))}
      </ol>
    </section>
  )
}
