import type { ReportStatus } from "@/types"

export const isOpenReport = (s: ReportStatus) => s === "open" || s === "investigating"
