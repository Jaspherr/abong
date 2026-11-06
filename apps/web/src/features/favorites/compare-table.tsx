import { MessageSquare } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { Photo } from "@/components/common/photo"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { GENDER_POLICIES, VISITOR_POLICIES } from "@/constants/listing"
import { InquiryDialog } from "@/features/inquiries/inquiry-dialog"
import { availabilitySummary, distanceLine, moveInEstimate, priceUnit, typeLabel } from "@/features/listings/listing-utils"
import { formatMonths, formatPeso } from "@/lib/format"
import type { Listing } from "@/types"

interface Row {
  label: string
  cell: (listing: Listing) => ReactNode
  /** Numeric value used to mark the cheapest option in the row (only when every listing is priced the same way). */
  lowest?: (listing: Listing) => number
}

const yesNo = (on: boolean, yes: string, no: string) => (on ? yes : <span className="text-muted-foreground">{no}</span>)

const ROWS: Row[] = [
  {
    label: "Monthly rent",
    cell: (l) => (
      <>
        <span className="font-semibold">{formatPeso(l.priceFrom)}</span>
        <span className="text-muted-foreground"> {priceUnit(l.pricingBasis)}</span>
      </>
    ),
    lowest: (l) => l.priceFrom,
  },
  {
    label: "Move-in estimate",
    cell: (l) => <span className="font-semibold">{formatPeso(moveInEstimate(l).total)}</span>,
    lowest: (l) => moveInEstimate(l).total,
  },
  {
    label: "Advance and deposit",
    cell: (l) => `${formatMonths(l.terms.advanceMonths)} + ${formatMonths(l.terms.depositMonths)}`,
  },
  { label: "Availability", cell: (l) => availabilitySummary(l).text },
  { label: "Type", cell: (l) => `${typeLabel(l)}, ${GENDER_POLICIES[l.genderPolicy].toLowerCase()}` },
  { label: "Minimum stay", cell: (l) => formatMonths(l.terms.minimumStayMonths) },
  { label: "Utilities", cell: (l) => yesNo(l.terms.utilitiesIncluded, "Included", "Not all included") },
  { label: "Curfew", cell: (l) => l.rules.curfew ?? "None" },
  { label: "Visitors", cell: (l) => VISITOR_POLICIES[l.rules.visitors] },
  { label: "Private CR", cell: (l) => yesNo(l.units.some((u) => u.privateCr), "Some rooms", "Shared only") },
  { label: "Aircon", cell: (l) => yesNo(l.units.some((u) => u.aircon), "Some rooms", "Fan only") },
  { label: "Distance", cell: (l) => distanceLine(l)?.text ?? <span className="text-muted-foreground">Not mapped</span> },
  { label: "Verified", cell: (l) => yesNo(l.isVerified, "Verified", "Not yet") },
]

/** Side-by-side view of saved places: the facts renters weigh, one row each. */
export function CompareTable({ listings }: { listings: Listing[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">Comparison of {listings.length} saved places</caption>
        <thead>
          <tr className="border-b border-border">
            <td className="sticky left-0 z-10 w-36 bg-card p-4" />
            {listings.map((l) => (
              <th key={l.id} scope="col" className="min-w-44 p-4 align-top font-normal">
                <Link to={PATHS.listing(l.id)} className="group block space-y-2">
                  <Photo src={l.photos[0]?.src} alt="" className="aspect-[3/2] rounded-lg" />
                  <span className="line-clamp-2 font-semibold group-hover:underline">{l.name}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            // Per-person and whole-unit prices aren't comparable, so only mark "lowest" when every place is priced the same way.
            const sameBasis = new Set(listings.map((l) => l.pricingBasis)).size === 1
            const values = row.lowest && sameBasis ? listings.map(row.lowest) : []
            const min = values.length ? Math.min(...values) : null
            // Only worth flagging when the options actually differ.
            const flag = min !== null && values.some((v) => v !== min)
            return (
              <tr key={row.label} className="border-b border-border last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-card p-4 align-top font-medium text-muted-foreground">
                  {row.label}
                </th>
                {listings.map((l, i) => (
                  <td key={l.id} className="p-4 align-top tabular">
                    {row.cell(l)}
                    {flag && values[i] === min && (
                      <span className="mt-1 block text-xs font-semibold text-success">Lowest</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
          <tr>
            <td className="sticky left-0 z-10 bg-card p-4" />
            {listings.map((l) => (
              <td key={l.id} className="p-4">
                <InquiryDialog listing={l}>
                  <Button variant="outline" size="sm">
                    <MessageSquare aria-hidden="true" />
                    Ask landlord
                    <span className="sr-only"> about {l.name}</span>
                  </Button>
                </InquiryDialog>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
