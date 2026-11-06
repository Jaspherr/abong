import { ImagePlus, Star, X } from "lucide-react"
import { useId, useRef, useState, type DragEvent } from "react"
import { cn } from "@/lib/utils"

export interface UploadedImage {
  id: string
  src: string
  name: string
}

const MAX_FILES = 12
const ACCEPT = ["image/jpeg", "image/png", "image/webp"]

/**
 * Photo picker for listings. Files are previewed locally with object URLs and
 * never leave the browser — there is no upload backend yet.
 */
export function ImageUpload({ value, onChange, invalid }: { value: UploadedImage[]; onChange: (images: UploadedImage[]) => void; invalid?: boolean }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const accepted = [...files].filter((f) => ACCEPT.includes(f.type) && f.size <= 8 * 1024 * 1024)
    // The same file picked twice would share an id, so removing one would remove both.
    const fileId = (f: File) => `${f.name}-${f.size}-${f.lastModified}`
    const taken = new Set(value.map((img) => img.id))
    const fresh = accepted.filter((f) => {
      const id = fileId(f)
      if (taken.has(id)) return false
      taken.add(id)
      return true
    })
    const room = Math.max(0, MAX_FILES - value.length)
    setRejected(
      accepted.length < files.length
        ? "Some files were skipped. Use JPG, PNG or WebP under 8 MB."
        : fresh.length > room
          ? `You can add up to ${MAX_FILES} photos, so some were left out.`
          : null,
    )
    const next = fresh.slice(0, room).map((file) => ({
      id: fileId(file),
      src: URL.createObjectURL(file),
      name: file.name,
    }))
    onChange([...value, ...next])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
          dragging ? "border-primary bg-secondary" : invalid ? "border-destructive/50" : "border-border hover:border-primary/40 hover:bg-muted/50",
        )}
      >
        <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
          <ImagePlus className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold">Add photos</span>
        <span className="max-w-xs text-xs text-muted-foreground">
          Drag images here or browse. Show the room, CR, kitchen and outside. Up to {MAX_FILES} photos, JPG, PNG or WebP.
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files)
            if (inputRef.current) inputRef.current.value = ""
          }}
        />
      </label>
      {rejected && <p className="text-xs text-warning">{rejected}</p>}
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Selected photos">
          {value.map((img, i) => (
            <li key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              <img src={img.src} alt={img.name} className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-white/95 px-1.5 py-0.5 text-caption font-semibold">
                  <Star className="size-3 fill-mango text-mango" aria-hidden="true" />
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.id !== img.id))}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-ink/70 text-white opacity-100 transition-opacity hover:bg-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label={`Remove ${img.name}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
