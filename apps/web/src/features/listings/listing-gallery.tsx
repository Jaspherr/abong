import { ChevronLeft, ChevronRight, Grid2x2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Photo } from "@/components/common/photo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { ListingPhoto } from "@/types"

function Lightbox({ photos, index, onIndex, open, onOpenChange, title }: {
  photos: ListingPhoto[]
  index: number
  onIndex: (i: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}) {
  const go = (delta: number) => onIndex((index + delta + photos.length) % photos.length)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const photo = photos[index]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(64rem,calc(100vw-2rem))] gap-3 border-none bg-ink p-3 text-white sm:max-w-[min(64rem,calc(100vw-2rem))] sm:p-4">
        <DialogTitle className="sr-only">{title} photos</DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys to move between photos.</DialogDescription>
        <div className="relative">
          <Photo key={photo.id} src={photo.src} alt={photo.alt} className="aspect-[4/3] rounded-md bg-white/5 animate-in fade-in-0 duration-200" />
          {photos.length > 1 && (
            <>
              <Button size="icon" variant="secondary" onClick={() => go(-1)} className="absolute top-1/2 left-3 -translate-y-1/2" aria-label="Previous photo">
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => go(1)} className="absolute top-1/2 right-3 -translate-y-1/2" aria-label="Next photo">
                <ChevronRight aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 px-1 text-sm text-white/70">
          <span>{photo.alt}</span>
          <span className="tabular" aria-live="polite">
            {index + 1} / {photos.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ListingGallery({ photos, title }: { photos: ListingPhoto[]; title: string }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const openAt = (i: number) => {
    setIndex(i)
    setOpen(true)
  }
  const tiles = photos.slice(0, 5)

  return (
    <>
      {/* Mobile: swipeable strip */}
      <div className="relative -mx-4 sm:hidden">
        <div
          ref={scroller}
          onScroll={(e) => setVisible(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        >
          {photos.map((photo, i) => (
            <button key={photo.id} type="button" onClick={() => openAt(i)} className="w-full shrink-0 snap-center" aria-label={`Open photo ${i + 1}: ${photo.alt}`}>
              <Photo src={photo.src} alt={photo.alt} priority={i === 0} className="aspect-[4/3]" />
            </button>
          ))}
        </div>
        <span className="absolute right-3 bottom-3 rounded-md bg-ink/75 px-2 py-1 text-xs font-medium text-white tabular backdrop-blur-sm">
          {visible + 1} / {photos.length}
        </span>
      </div>

      {/* Tablet and up: one large lead photo with the rest in a mosaic beside it. */}
      <div
        className={cn(
          "relative hidden h-[min(30rem,50vw)] gap-2 overflow-hidden rounded-xl sm:grid",
          tiles.length >= 4 ? "grid-cols-4 grid-rows-2" : tiles.length === 3 ? "grid-cols-3 grid-rows-2" : "grid-cols-2",
        )}
      >
        {tiles.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => openAt(i)}
            className={cn(
              "group relative overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
              i === 0 && tiles.length >= 3 && "col-span-2 row-span-2",
              // With four photos the 4×2 grid has one spare cell, so the first side photo fills the top row.
              i === 1 && tiles.length === 4 && "col-span-2",
            )}
            aria-label={`Open photo ${i + 1}: ${photo.alt}`}
          >
            <Photo src={photo.src} alt={photo.alt} priority={i === 0} className="size-full" imgClassName="transition-[transform,filter] duration-500 ease-soft group-hover:scale-[1.02] group-hover:brightness-95" />
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => openAt(0)} className="absolute right-4 bottom-4 border-transparent bg-card shadow-raised">
          <Grid2x2 aria-hidden="true" />
          All {photos.length} photos
        </Button>
      </div>

      <Lightbox photos={photos} index={index} onIndex={setIndex} open={open} onOpenChange={setOpen} title={title} />
    </>
  )
}
