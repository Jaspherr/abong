import type { Report, ReportReason } from "@/types"
import { db, nextId } from "./mock/db"
import { notFound, respond } from "./mock/latency"

export const reportsService = {
  create(input: { listingId: string; reporterId: string | null; reason: ReportReason; details: string }): Promise<Report> {
    return respond(() => {
      const property = db.properties.find((p) => p.id === input.listingId) ?? notFound("Listing")
      const report: Report = { ...input, id: nextId("r"), status: "open", createdAt: new Date().toISOString() }
      db.reports.unshift(report)
      db.activity.unshift({
        id: nextId("a"),
        kind: "report-filed",
        title: `Report on ${property.name}`,
        detail: input.reason.replace(/-/g, " "),
        at: report.createdAt,
        href: "/admin/reports",
      })
      return report
    }, 600)
  },
}
