import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns"

const LOCALE = "en-PH"

const peso = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
})

const integer = new Intl.NumberFormat(LOCALE)

/** ₱4,500 */
export function formatPeso(amount: number) {
  return peso.format(amount)
}

/** ₱4.5k — used on map markers where space is tight. */
export function formatPesoShort(amount: number) {
  return amount >= 1000 ? `₱${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : `₱${amount}`
}

export function formatNumber(value: number) {
  return integer.format(value)
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export function formatMonths(months: number) {
  if (months === 0) return "None"
  return `${months} month${months === 1 ? "" : "s"}`
}

const toDate = (value: string | Date) => (typeof value === "string" ? parseISO(value) : value)

export function formatDate(value: string | Date, pattern = "MMM d, yyyy") {
  return format(toDate(value), pattern)
}

export function formatTime(time24: string) {
  const [h, m] = time24.split(":").map(Number)
  const date = new Date(2000, 0, 1, h, m)
  return format(date, "h:mm a")
}

export function formatRelative(value: string | Date) {
  const date = toDate(value)
  const days = differenceInCalendarDays(new Date(), date)
  if (days === 0) {
    const label = formatDistanceToNowStrict(date, { roundingMethod: "floor" })
    return label.startsWith("0 ") || label.includes("second") ? "just now" : `${label} ago`
  }
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return format(date, days > 300 ? "MMM d, yyyy" : "MMM d")
}

const DAY_MS = 86_400_000

/** Whole and fractional days elapsed since an ISO timestamp. */
export function daysSince(value: string) {
  return (Date.now() - Date.parse(value)) / DAY_MS
}

/** Availability confirmed longer ago than this is treated as stale everywhere. */
export const isAvailabilityStale = (confirmedAt: string) => daysSince(confirmedAt) > 21

/** True when a date is later than tomorrow — "available from" is in the future. */
export function isLaterThanTomorrow(value: string) {
  return Date.parse(value) > Date.now() + DAY_MS
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
