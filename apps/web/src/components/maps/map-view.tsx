import { MapPinOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Coordinates } from "@/types"
import { PANGASINAN_CENTER, type MapAdapter, type MapInstance, type MapMarker, type MapProviderId } from "./types"

/** Providers are code-split: the map library only loads when a map is on screen. */
const PROVIDERS: Record<MapProviderId, () => Promise<MapAdapter>> = {
  osm: () => import("./providers/leaflet-osm").then((m) => m.leafletOsmAdapter),
}

const PROVIDER_ID = (import.meta.env.VITE_MAP_PROVIDER as MapProviderId | undefined) ?? "osm"


interface MapViewProps {
  markers: MapMarker[]
  activeId?: string | null
  center?: Coordinates
  zoom?: number
  /** Re-fit the viewport whenever the set of markers changes. */
  fitToMarkers?: boolean
  interactive?: boolean
  onMarkerClick?: (id: string) => void
  onMarkerHover?: (id: string | null) => void
  className?: string
  label: string
}

export function MapView({
  markers,
  activeId = null,
  center = PANGASINAN_CENTER,
  zoom = 13,
  fitToMarkers = true,
  interactive = true,
  onMarkerClick,
  onMarkerHover,
  className,
  label,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<MapInstance | null>(null)
  const handlers = useRef({ onMarkerClick, onMarkerHover })
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    handlers.current = { onMarkerClick, onMarkerHover }
  })

  // Mount once; marker updates are pushed through the adapter below.
  useEffect(() => {
    let cancelled = false
    PROVIDERS[PROVIDER_ID]()
      .then((adapter) => {
        if (cancelled || !containerRef.current) return
        instanceRef.current = adapter.create(
          containerRef.current,
          { center, zoom, interactive },
          {
            onMarkerClick: (id) => handlers.current.onMarkerClick?.(id),
            onMarkerHover: (id) => handlers.current.onMarkerHover?.(id),
          },
        )
        setStatus("ready")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Initial view only; later changes go through setView/fitToMarkers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markerKey = markers.map((m) => m.id).join("|")
  useEffect(() => {
    const map = instanceRef.current
    if (status !== "ready" || !map) return
    map.setMarkers(markers, activeId)
    if (fitToMarkers && markers.length) map.fitToMarkers()
    else map.setView(center, zoom)
    // Keyed on the marker set, not object identity, to avoid refitting on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, markerKey])

  useEffect(() => {
    instanceRef.current?.setActive(activeId)
  }, [activeId])

  // Keep tiles correct when the container is resized (e.g. switching list/map on mobile).
  useEffect(() => {
    const el = containerRef.current
    if (!el || status !== "ready") return
    const observer = new ResizeObserver(() => instanceRef.current?.invalidateSize())
    observer.observe(el)
    return () => observer.disconnect()
  }, [status])

  return (
    <div className={cn("relative isolate overflow-hidden bg-[#e8eeec]", className)}>
      <div ref={containerRef} className="absolute inset-0" role="region" aria-label={label} />
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-[#e3eae8]" aria-hidden="true" />}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <MapPinOff className="size-5" aria-hidden="true" />
            The map couldn't load. Listings are still available in the list.
          </div>
        </div>
      )}
    </div>
  )
}
