import type { Rental, Review, ReviewReport } from "@/types"
import { properties } from "./properties"
import { daysAgo } from "./time"

/**
 * Fictional rentals and reviews, like every other person and listing in the demo.
 * Each review points at a confirmed rental or a completed viewing below or in
 * engagement.ts, so the same eligibility rules apply to seed data as to new reviews.
 */

const day = (n: number) => daysAgo(n).slice(0, 10)

function names(listingId: string, unitId?: string) {
  const property = properties.find((p) => p.id === listingId)
  return {
    propertyName: property?.name ?? listingId,
    unitName: unitId ? property?.units.find((u) => u.id === unitId)?.name : undefined,
  }
}

function rental(r: Omit<Rental, "propertyName" | "unitName" | "createdAt" | "updatedAt"> & { created: number }): Rental {
  const { created, ...rest } = r
  return { ...rest, ...names(r.listingId, r.unitId), createdAt: daysAgo(created), updatedAt: daysAgo(created) }
}

export const rentals: Rental[] = [
  // The demo renter moved in after her viewing; too soon to review the stay, but she can review the viewing.
  rental({
    id: "r-1",
    renterId: "u-renter-1",
    landlordId: "l3",
    listingId: "ferrer-compound",
    startDate: day(12),
    proposedBy: "landlord",
    status: "confirmed",
    confirmedAt: daysAgo(11),
    created: 12,
  }),
  rental({
    id: "r-2",
    renterId: "u-renter-3",
    landlordId: "l1",
    listingId: "santos-boarding-house",
    unitId: "santos-boarding-house-u1",
    startDate: day(400),
    endDate: day(60),
    proposedBy: "renter",
    status: "ended",
    confirmedAt: daysAgo(398),
    created: 399,
  }),
  rental({
    id: "r-3",
    renterId: "u-renter-10",
    landlordId: "l1",
    listingId: "santos-annex",
    startDate: day(200),
    proposedBy: "landlord",
    status: "confirmed",
    confirmedAt: daysAgo(199),
    created: 200,
  }),
  rental({
    id: "r-4",
    renterId: "u-renter-2",
    landlordId: "l1",
    listingId: "santos-residence-tapuac",
    startDate: day(300),
    endDate: day(120),
    proposedBy: "renter",
    status: "ended",
    confirmedAt: daysAgo(299),
    created: 300,
  }),
  rental({
    id: "r-5",
    renterId: "u-renter-11",
    landlordId: "l2",
    listingId: "bautista-apartments",
    startDate: day(150),
    endDate: day(30),
    proposedBy: "landlord",
    status: "ended",
    confirmedAt: daysAgo(149),
    created: 150,
  }),
  // Living at the demo landlord's places now, so the dashboard and property pages show who's where.
  // Room 101 has three beds taken but only two recorded: landlords don't always record everyone.
  rental({
    id: "r-7",
    renterId: "u-renter-12",
    landlordId: "l1",
    listingId: "santos-boarding-house",
    unitId: "santos-boarding-house-u1",
    startDate: day(95),
    proposedBy: "landlord",
    status: "confirmed",
    confirmedAt: daysAgo(94),
    created: 95,
  }),
  rental({
    id: "r-8",
    renterId: "u-renter-4",
    landlordId: "l1",
    listingId: "santos-boarding-house",
    unitId: "santos-boarding-house-u1",
    startDate: day(40),
    proposedBy: "renter",
    status: "confirmed",
    confirmedAt: daysAgo(39),
    created: 40,
  }),
  rental({
    id: "r-9",
    renterId: "u-renter-6",
    landlordId: "l1",
    listingId: "santos-boarding-house",
    unitId: "santos-boarding-house-u2",
    startDate: day(180),
    proposedBy: "landlord",
    status: "confirmed",
    confirmedAt: daysAgo(179),
    created: 180,
  }),
  // Waiting for the demo landlord to confirm.
  rental({
    id: "r-6",
    renterId: "u-renter-7",
    landlordId: "l1",
    listingId: "santos-residence-tapuac",
    unitId: "santos-residence-tapuac-u2",
    startDate: day(3),
    proposedBy: "renter",
    status: "pending",
    created: 2,
  }),
]

const propertyName = (listingId: string) => names(listingId).propertyName

export const reviews: Review[] = [
  {
    id: "rv-1",
    kind: "residence",
    sourceId: "r-2",
    authorId: "u-renter-3",
    landlordId: "l1",
    listingId: "santos-boarding-house",
    overall: 5,
    aspects: { communication: 5, accuracy: 5, maintenance: 4, professionalism: 5 },
    recommend: true,
    body: "Stayed almost a year while reviewing for boards. The room was exactly as listed, and the caretaker fixed a leaking faucet the same day I mentioned it. Quiet hours are actually enforced.",
    status: "published",
    propertyName: propertyName("santos-boarding-house"),
    createdAt: daysAgo(55),
  },
  {
    id: "rv-2",
    kind: "residence",
    sourceId: "r-3",
    authorId: "u-renter-10",
    landlordId: "l1",
    listingId: "santos-annex",
    overall: 4,
    aspects: { communication: 4, accuracy: 4, maintenance: 3, professionalism: 5 },
    recommend: true,
    body: "Good value for Dagupan. Water pressure on the top floor is weak in the mornings, which wasn't mentioned, but everything else matched the listing.",
    status: "published",
    propertyName: propertyName("santos-annex"),
    createdAt: daysAgo(140),
    response: {
      body: "Thank you, Carlo. We've since added a booster pump for the top floor. Let us know if mornings are better now.",
      createdAt: daysAgo(137),
    },
  },
  {
    id: "rv-3",
    kind: "residence",
    sourceId: "r-4",
    authorId: "u-renter-2",
    landlordId: "l1",
    listingId: "santos-residence-tapuac",
    overall: 3,
    aspects: { communication: 3, accuracy: 2, professionalism: 4 },
    recommend: false,
    body: "The advance and deposit were as agreed, but the room was smaller than the photos suggest and the shared CR was often busy. Fine for a short stay.",
    status: "published",
    propertyName: propertyName("santos-residence-tapuac"),
    createdAt: daysAgo(115),
    response: {
      body: "Thanks for the honest feedback, Paolo. We've retaken the photos with the room size in the description, and added a second CR on that floor.",
      createdAt: daysAgo(110),
    },
  },
  {
    id: "rv-4",
    kind: "residence",
    sourceId: "r-5",
    authorId: "u-renter-11",
    landlordId: "l2",
    listingId: "bautista-apartments",
    overall: 4,
    aspects: { communication: 5, accuracy: 4, maintenance: 4 },
    recommend: true,
    body: "Responsive landlord and a clean unit. Parking is tight on weekdays.",
    status: "published",
    propertyName: propertyName("bautista-apartments"),
    createdAt: daysAgo(25),
  },
  {
    id: "rv-5",
    kind: "viewing",
    sourceId: "v-6",
    authorId: "u-renter-3",
    landlordId: "l1",
    listingId: "mayombo-ladies-dorm",
    overall: 5,
    aspects: { reliability: 5, punctuality: 5, communication: 5, accuracy: 4 },
    body: "Ate Lorna was waiting at the gate on time and walked me through the house rules and curfew.",
    status: "published",
    propertyName: propertyName("mayombo-ladies-dorm"),
    createdAt: daysAgo(5),
  },
]

export const reviewReports: ReviewReport[] = []
