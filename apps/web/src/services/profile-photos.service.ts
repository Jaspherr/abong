import type { OwnPhoto, PhotoVisibility, ProfilePhoto, User } from "@/types"
import { usersInMutualContact } from "./contact"
import { db } from "./mock/db"
import { ServiceError, respond } from "./mock/latency"
import { requireUser, sessionUser } from "./mock/session"

/**
 * Profile photos. The page crops and re-encodes the picture before it gets here, but this
 * service checks the result again rather than trusting it, and only ever touches the
 * signed-in user's own photo. Who may see a photo is decided here, from the session.
 *
 * Demo limits: photos live in this browser's storage, so they don't follow the account to
 * another device, and these checks run in the browser. The real API must repeat them
 * server-side (docs/backend-integration.md).
 */

/** Largest stored photo. A 320px WebP is usually 10–30 KB. */
export const MAX_STORED_PHOTO_BYTES = 200 * 1024

const ALLOWED = {
  "image/webp": (b: Uint8Array) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  "image/jpeg": (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
} as const

function checkDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:webp|jpeg));base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl)
  if (!match) throw new ServiceError("invalid", "That photo couldn't be saved. Try a JPEG, PNG or WebP image.")
  const [, type, payload] = match
  const bytes = Math.floor((payload.length * 3) / 4)
  if (bytes > MAX_STORED_PHOTO_BYTES) throw new ServiceError("invalid", "That photo is too large to save.")
  const head = Uint8Array.from(atob(payload.slice(0, 16)), (c) => c.charCodeAt(0))
  if (!ALLOWED[type as keyof typeof ALLOWED](head)) {
    throw new ServiceError("invalid", "That file isn't a valid image.")
  }
}

function allowedVisibility(user: User, visibility: PhotoVisibility) {
  // Renter photos are never public.
  if (visibility === "public" && user.role !== "landlord") {
    throw new ServiceError("forbidden", "Renter photos can't be made public.")
  }
}

/** The default when someone first adds a photo. */
const defaultVisibility = (user: User): PhotoVisibility => (user.role === "landlord" ? "public" : "contacts")

function canSee(viewer: User | undefined, photo: ProfilePhoto): boolean {
  if (viewer?.id === photo.userId) return true
  if (viewer?.role === "admin" && viewer.status === "active") return true
  const owner = db.users.find((u) => u.id === photo.userId)
  if (!owner || owner.status === "suspended" || owner.status === "deactivated") return false
  if (photo.visibility === "public") return owner.role === "landlord"
  if (photo.visibility === "contacts") return !!viewer && usersInMutualContact(viewer.id, owner.id)
  return false
}

function ownPhoto(user: User): OwnPhoto {
  const photo = db.profilePhotos.find((p) => p.userId === user.id)
  return photo
    ? { url: photo.dataUrl, visibility: photo.visibility, updatedAt: photo.updatedAt }
    : { visibility: defaultVisibility(user) }
}

export const profilePhotosService = {
  /** The photo for one person, or null when there is none or the viewer may not see it. */
  get(userId: string): Promise<string | null> {
    return respond(() => {
      const photo = db.profilePhotos.find((p) => p.userId === userId)
      return photo && canSee(sessionUser(), photo) ? photo.dataUrl : null
    }, 120)
  },

  getMine(): Promise<OwnPhoto> {
    return respond(() => ownPhoto(requireUser()), 120)
  },

  setMine(dataUrl: string): Promise<OwnPhoto> {
    return respond(() => {
      const user = requireUser()
      checkDataUrl(dataUrl)
      const now = new Date().toISOString()
      const existing = db.profilePhotos.find((p) => p.userId === user.id)
      if (existing) Object.assign(existing, { dataUrl, updatedAt: now })
      else db.profilePhotos.push({ userId: user.id, dataUrl, visibility: defaultVisibility(user), updatedAt: now })
      return ownPhoto(user)
    }, 500)
  },

  setVisibility(visibility: PhotoVisibility): Promise<OwnPhoto> {
    return respond(() => {
      const user = requireUser()
      allowedVisibility(user, visibility)
      const photo = db.profilePhotos.find((p) => p.userId === user.id)
      if (!photo) throw new ServiceError("not-found", "Add a photo first.")
      photo.visibility = visibility
      return ownPhoto(user)
    })
  },

  removeMine(): Promise<OwnPhoto> {
    return respond(() => {
      const user = requireUser()
      db.profilePhotos = db.profilePhotos.filter((p) => p.userId !== user.id)
      return ownPhoto(user)
    })
  },
}
