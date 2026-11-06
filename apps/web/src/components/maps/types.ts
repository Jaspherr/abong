import type { Coordinates } from "@/types"

/** Geographic centre of the province — used when there is nothing to fit. */
export const PANGASINAN_CENTER: Coordinates = { lat: 15.98, lng: 120.36 }

export interface MapMarker {
  id: string
  position: Coordinates
  /** Short text rendered inside the marker, e.g. "₱4.5k". */
  label?: string
  /** Accessible / tooltip name. */
  title: string
  kind: "listing" | "place"
  verified?: boolean
}

export interface MapViewOptions {
  center: Coordinates
  zoom: number
  interactive: boolean
}

/**
 * Contract every map provider implements. Components only talk to this
 * interface, so swapping OpenStreetMap for Mapbox or Google Maps means writing
 * one new adapter in ./providers and registering it in map-view.tsx.
 */
export interface MapInstance {
  setMarkers(markers: MapMarker[], activeId?: string | null): void
  setActive(activeId: string | null): void
  fitToMarkers(padding?: number): void
  setView(center: Coordinates, zoom: number): void
  invalidateSize(): void
  destroy(): void
}

export interface MapAdapter {
  create(
    element: HTMLElement,
    options: MapViewOptions,
    events: { onMarkerClick?: (id: string) => void; onMarkerHover?: (id: string | null) => void },
  ): MapInstance
}

export type MapProviderId = "osm"
