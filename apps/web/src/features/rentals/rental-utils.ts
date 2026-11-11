import { formatDate } from "@/lib/format"
import type { RentalWithContext } from "@/services"

/** The dates of a stay in words: "Since March 3, 2026", "Moving in May 1, 2026", "March 2025 to June 2026". */
export function stayDates(rental: RentalWithContext) {
  const start = formatDate(rental.startDate, "MMMM d, yyyy")
  switch (rental.phase) {
    case "upcoming":
      return `Moving in ${start}`
    case "current":
      return `Since ${start}`
    case "past":
      return `${formatDate(rental.startDate, "MMMM yyyy")} to ${formatDate(rental.endDate ?? rental.startDate, "MMMM yyyy")}`
    default:
      return rental.endDate
        ? `${formatDate(rental.startDate, "MMMM yyyy")} to ${formatDate(rental.endDate, "MMMM yyyy")}`
        : `From ${start}`
  }
}

/** Stays that mean someone lives there now or is about to. */
export const isLivingThere = (r: RentalWithContext) => r.phase === "current" || r.phase === "upcoming"
