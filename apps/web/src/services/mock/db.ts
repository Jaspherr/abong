import { favorites, inquiries, notifications, viewings } from "@/data/engagement"
import { landmarks, municipalities, universities } from "@/data/locations"
import { activity, reports, verificationRequests } from "@/data/moderation"
import { properties } from "@/data/properties"
import { rentals, reviewReports, reviews } from "@/data/rentals"
import { landlordProfiles, renterProfiles, users } from "@/data/users"
import type { AuditEntry, ProfilePhoto } from "@/types"

/**
 * In-memory stand-in for the future backend. Services read and mutate this
 * object; nothing outside /services should import it.
 *
 * Mutable collections are snapshotted to localStorage so demo changes
 * (inquiries sent, listings approved…) survive reloads. Bump the version when
 * the seed data shape changes.
 */
const STORE_KEY = "abong:demo-db:v1"

function seed() {
  return structuredClone({
    properties,
    users,
    renterProfiles,
    landlordProfiles,
    favorites,
    inquiries,
    viewings,
    notifications,
    reports,
    verificationRequests,
    activity,
    // Starts empty: the log holds only decisions actually made in this demo.
    auditLog: [] as AuditEntry[],
    // Starts empty: demo accounts never use photos of real people.
    profilePhotos: [] as ProfilePhoto[],
    rentals,
    reviews,
    reviewReports,
  })
}

type MutableStore = ReturnType<typeof seed>

function load(): MutableStore {
  const fresh = seed()
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? { ...fresh, ...(JSON.parse(raw) as Partial<MutableStore>) } : fresh
  } catch {
    return fresh
  }
}

export const db = {
  // Reference data ships with the client and is never mutated.
  municipalities,
  universities,
  landmarks,
  ...load(),
}

let saveTimer: number | undefined
let savePending = false
let resetting = false

function save() {
  savePending = false
  if (resetting) return
  const { municipalities: _m, universities: _u, landmarks: _l, ...mutable } = db
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(mutable))
  } catch {
    // Storage full or unavailable: changes simply last for this page load.
  }
}

/** Debounced snapshot of the mutable collections. */
export function scheduleSave() {
  savePending = true
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(save, 150)
}

// Leaving the page inside the debounce window would otherwise lose the latest change.
window.addEventListener("pagehide", () => {
  if (savePending) save()
})

/** Restores the original demo dataset. */
export function resetDemoData() {
  // The reload that follows must not write the old data back.
  resetting = true
  try {
    localStorage.removeItem(STORE_KEY)
    localStorage.removeItem("abong:saved-searches")
  } catch {
    // Nothing persisted, nothing to clear.
  }
}

let counter = 0
export const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`
