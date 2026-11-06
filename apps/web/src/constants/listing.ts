import {
  AirVent,
  Bath,
  BookOpen,
  Car,
  Cctv,
  CookingPot,
  DoorClosed,
  Heater,
  PawPrint,
  Refrigerator,
  Sofa,
  WashingMachine,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react"
import type {
  AmenityId,
  GenderPolicy,
  PropertyType,
  RoomArrangement,
  SortKey,
  UnitStatus,
  VisitorPolicy,
} from "@/types"

export const PROPERTY_TYPES: Record<PropertyType, { label: string; plural: string; description: string }> = {
  "boarding-house": {
    label: "Boarding house",
    plural: "Boarding houses",
    description: "Rooms and beds in a shared, landlord-run house",
  },
  room: { label: "Room", plural: "Rooms", description: "A private room inside a home" },
  bedspace: { label: "Bedspace", plural: "Bedspaces", description: "A bed in a shared room, rented per person" },
  apartment: { label: "Apartment", plural: "Apartments", description: "Self-contained unit with its own kitchen and CR" },
  studio: { label: "Studio unit", plural: "Studio units", description: "One open room with kitchenette and CR" },
  condominium: { label: "Condo unit", plural: "Condo units", description: "Unit in a managed residential building" },
  house: { label: "House", plural: "Houses", description: "Whole house for families or groups" },
  dormitory: { label: "Dormitory", plural: "Dormitories", description: "Managed student housing with house rules" },
}

export const PROPERTY_TYPE_ORDER: PropertyType[] = [
  "boarding-house",
  "bedspace",
  "room",
  "dormitory",
  "studio",
  "apartment",
  "condominium",
  "house",
]

export const AMENITIES: Record<AmenityId, { label: string; short: string; icon: LucideIcon }> = {
  wifi: { label: "Wi-Fi", short: "Wi-Fi", icon: Wifi },
  aircon: { label: "Air conditioning", short: "Aircon", icon: AirVent },
  "private-cr": { label: "Private CR", short: "Private CR", icon: Bath },
  kitchen: { label: "Kitchen access", short: "Kitchen", icon: CookingPot },
  laundry: { label: "Laundry area", short: "Laundry", icon: WashingMachine },
  parking: { label: "Parking", short: "Parking", icon: Car },
  furnished: { label: "Furnished", short: "Furnished", icon: Sofa },
  "utilities-included": { label: "Utilities included", short: "Utilities incl.", icon: Zap },
  pets: { label: "Pets allowed", short: "Pets OK", icon: PawPrint },
  cctv: { label: "CCTV", short: "CCTV", icon: Cctv },
  "study-area": { label: "Study area", short: "Study area", icon: BookOpen },
  "water-heater": { label: "Water heater", short: "Heater", icon: Heater },
  refrigerator: { label: "Shared refrigerator", short: "Ref", icon: Refrigerator },
  gated: { label: "Gated with caretaker", short: "Gated", icon: DoorClosed },
}

/** Amenities offered as search filters, in the order renters scan for them. */
export const FILTER_AMENITIES: AmenityId[] = [
  "wifi",
  "aircon",
  "private-cr",
  "kitchen",
  "laundry",
  "parking",
  "furnished",
  "utilities-included",
  "pets",
]

export const GENDER_POLICIES: Record<GenderPolicy, string> = {
  male: "Male only",
  female: "Female only",
  "co-ed": "Co-ed",
}

/** Search-filter wording: picking "female" also includes co-ed places. */
export const GENDER_FILTER_LABELS: Record<GenderPolicy, string> = {
  female: "Female boarders",
  male: "Male boarders",
  "co-ed": "Co-ed only",
}

export const ARRANGEMENTS: Record<RoomArrangement, string> = {
  private: "Private room",
  shared: "Shared room",
}

export const UNIT_STATUSES: Record<UnitStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Under repair",
}

export const VISITOR_POLICIES: Record<VisitorPolicy, string> = {
  allowed: "Visitors allowed",
  "daytime-only": "Visitors until 8:00 PM",
  "not-allowed": "No visitors inside rooms",
}

export const SORT_OPTIONS: Record<SortKey, string> = {
  recommended: "Recommended",
  "price-asc": "Lowest rent",
  "price-desc": "Highest rent",
  newest: "Recently updated",
  distance: "Nearest",
}

export const MIN_STAY_OPTIONS = [
  { value: 1, label: "1 month or less" },
  { value: 5, label: "Up to a semester" },
  { value: 12, label: "Up to a year" },
] as const

export const PRICE_BOUNDS = { min: 1000, max: 30000, step: 500 } as const
