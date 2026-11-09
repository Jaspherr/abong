import { Loader2, Minus, Plus } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MAX_ZOOM, MIN_ZOOM, centredCrop, clampCrop, cropSide, drawCrop, type Crop } from "./photo-image"

const STEP = 0.1

/**
 * Square crop with a round preview. Drag or use the arrow keys to move the picture,
 * and the slider or +/- keys to zoom.
 */
export function PhotoCropDialog({
  image,
  saving,
  error,
  onCancel,
  onSave,
}: {
  image: ImageBitmap | null
  saving: "preparing" | "saving" | null
  error?: string
  onCancel: () => void
  onSave: (crop: Crop) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null)
  const zoomId = useId()
  const hintId = useId()
  const [crop, setCrop] = useState<Crop | null>(null)
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)

  // A new picture starts centred.
  const [shown, setShown] = useState<ImageBitmap | null>(null)
  if (image !== shown) {
    setShown(image)
    setCrop(image ? centredCrop(image) : null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !crop) return
    const side = Math.round((frame?.clientWidth ?? 256) * Math.min(2, window.devicePixelRatio || 1))
    drawCrop(canvas, image, crop, side)
  }, [image, crop, frame])

  const update = (next: Crop) => image && setCrop(clampCrop(image, next))

  /** Screen pixels to image pixels at the current zoom. */
  const scale = () => (image && crop && frame ? cropSide(image, crop.zoom) / frame.clientWidth : 1)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!crop) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, crop }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const k = scale()
    update({ ...start.crop, cx: start.crop.cx - (e.clientX - start.x) * k, cy: start.crop.cy - (e.clientY - start.y) * k })
  }
  const endDrag = () => {
    drag.current = null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!image || !crop) return
    const nudge = cropSide(image, crop.zoom) * (e.shiftKey ? 0.2 : 0.05)
    const moves: Record<string, Partial<Crop>> = {
      ArrowLeft: { cx: crop.cx - nudge },
      ArrowRight: { cx: crop.cx + nudge },
      ArrowUp: { cy: crop.cy - nudge },
      ArrowDown: { cy: crop.cy + nudge },
      "+": { zoom: crop.zoom + STEP },
      "=": { zoom: crop.zoom + STEP },
      "-": { zoom: crop.zoom - STEP },
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    update({ ...crop, ...move })
  }

  const busy = saving !== null

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Position your photo</DialogTitle>
          <DialogDescription id={hintId}>
            Drag the photo, or use the arrow keys, to choose what shows inside the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-72">
          <div
            ref={setFrame}
            role="group"
            aria-label="Photo position"
            aria-describedby={hintId}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            className="relative aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl bg-muted outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:cursor-grabbing"
          >
            <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
            {/* Dims everything outside the circle the avatar will show. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_color-mix(in_srgb,var(--foreground)_45%,transparent)] ring-1 ring-white/70"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              disabled={!crop || crop.zoom <= MIN_ZOOM || busy}
              onClick={() => crop && update({ ...crop, zoom: crop.zoom - STEP * 2 })}
            >
              <Minus aria-hidden="true" />
            </Button>
            <label htmlFor={zoomId} className="sr-only">
              Zoom
            </label>
            <input
              id={zoomId}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={crop?.zoom ?? 1}
              disabled={busy}
              onChange={(e) => crop && update({ ...crop, zoom: Number(e.target.value) })}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              disabled={!crop || crop.zoom >= MAX_ZOOM || busy}
              onClick={() => crop && update({ ...crop, zoom: crop.zoom + STEP * 2 })}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-meta text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => crop && onSave(crop)} disabled={!crop || busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {saving === "preparing" ? "Preparing photo" : saving === "saving" ? "Saving" : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
