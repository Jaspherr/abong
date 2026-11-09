/**
 * Turns a picked file into a small square profile photo. Decoding and re-drawing the image
 * on a canvas keeps only the pixels, so EXIF data such as GPS location and camera details
 * never leaves the device.
 */

export const PHOTO_LIMITS = {
  /** Largest file accepted from the device. */
  maxFileBytes: 10 * 1024 * 1024,
  /** Shortest side needed for a sharp result. */
  minSide: 200,
  /** Guards against decompression bombs and huge canvases. */
  maxSide: 8000,
  /** Size of the saved square. */
  outputSide: 320,
} as const

export const ACCEPTED_PHOTO_TYPES = "image/jpeg,image/png,image/webp"

export class PhotoError extends Error {}

/** Checks the first bytes, so a renamed file of another kind is refused before decoding. */
function sniff(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "png"
  const ascii = String.fromCharCode(...bytes.slice(0, 12))
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp"
  return null
}

/** Validates and decodes a picked file. Throws PhotoError with a message to show. */
export async function decodePhoto(file: File): Promise<ImageBitmap> {
  if (file.size > PHOTO_LIMITS.maxFileBytes) {
    throw new PhotoError("That file is over 10 MB. Choose a smaller photo.")
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!sniff(head)) {
    throw new PhotoError("Choose a JPEG, PNG or WebP photo.")
  }
  let bitmap: ImageBitmap
  try {
    // Respects the camera's rotation flag, then the flag is dropped with the rest of the metadata.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new PhotoError("That photo couldn't be opened. It may be damaged; try another one.")
  }
  const short = Math.min(bitmap.width, bitmap.height)
  const long = Math.max(bitmap.width, bitmap.height)
  if (short < PHOTO_LIMITS.minSide) {
    bitmap.close()
    throw new PhotoError(`That photo is too small. Use one at least ${PHOTO_LIMITS.minSide} pixels on each side.`)
  }
  if (long > PHOTO_LIMITS.maxSide) {
    bitmap.close()
    throw new PhotoError(`That photo is too large. Use one under ${PHOTO_LIMITS.maxSide} pixels on its longest side.`)
  }
  return bitmap
}

/**
 * The part of the image to keep: a square, as its centre in image pixels and a zoom
 * where 1 means the square spans the image's shorter side.
 */
export interface Crop {
  cx: number
  cy: number
  zoom: number
}

export const MIN_ZOOM = 1
export const MAX_ZOOM = 3

export const cropSide = (image: { width: number; height: number }, zoom: number) =>
  Math.min(image.width, image.height) / zoom

export function centredCrop(image: { width: number; height: number }): Crop {
  return { cx: image.width / 2, cy: image.height / 2, zoom: 1 }
}

/** Keeps the square inside the image. */
export function clampCrop(image: { width: number; height: number }, crop: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom))
  const half = cropSide(image, zoom) / 2
  return {
    zoom,
    cx: Math.min(image.width - half, Math.max(half, crop.cx)),
    cy: Math.min(image.height - half, Math.max(half, crop.cy)),
  }
}

export function drawCrop(canvas: HTMLCanvasElement, image: ImageBitmap, crop: Crop, side: number) {
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const s = cropSide(image, crop.zoom)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, crop.cx - s / 2, crop.cy - s / 2, s, s, 0, 0, side, side)
}

/** Encodes the cropped square. WebP where the browser can write it, JPEG otherwise. */
export async function exportCrop(image: ImageBitmap, crop: Crop): Promise<string> {
  const canvas = document.createElement("canvas")
  drawCrop(canvas, image, crop, PHOTO_LIMITS.outputSide)
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  let blob = await encode("image/webp", 0.85)
  // Browsers that can't write WebP silently return PNG instead.
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88)
  if (!blob) throw new PhotoError("That photo couldn't be prepared. Try again.")
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new PhotoError("That photo couldn't be prepared. Try again."))
    reader.readAsDataURL(blob)
  })
}
