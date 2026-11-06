import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MapAdapter, MapInstance, MapMarker } from "../types"

/**
 * Standard OpenStreetMap tiles. Fine for development and demos under the OSM
 * tile usage policy; production traffic should move to a hosted tile provider
 * (Mapbox, MapTiler, Stadia…) by swapping this URL or adding a new adapter.
 */
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch)

function iconFor(marker: MapMarker) {
  if (marker.kind === "place") {
    return L.divIcon({ className: "abong-place-marker", html: "<span></span>", iconSize: [0, 0] })
  }
  return L.divIcon({
    className: "abong-price-marker",
    html: `<span>${escapeHtml(marker.label ?? "")}</span>`,
    iconSize: [0, 0],
  })
}

export const leafletOsmAdapter: MapAdapter = {
  create(element, options, events): MapInstance {
    const map = L.map(element, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      zoomControl: options.interactive,
      scrollWheelZoom: options.interactive,
      dragging: options.interactive,
      touchZoom: options.interactive,
      doubleClickZoom: options.interactive,
      keyboard: options.interactive,
      attributionControl: true,
    })
    map.attributionControl.setPrefix(false)
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    const byId = new Map<string, { marker: L.Marker; data: MapMarker }>()
    let activeId: string | null = null

    const applyActive = () => {
      byId.forEach(({ marker, data }) => {
        const el = marker.getElement()
        if (!el) return
        el.dataset.active = String(data.id === activeId)
        el.dataset.verified = String(Boolean(data.verified))
        marker.setZIndexOffset(data.id === activeId ? 1000 : data.kind === "place" ? 500 : 0)
      })
    }

    return {
      setMarkers(markers, nextActive = null) {
        layer.clearLayers()
        byId.clear()
        activeId = nextActive
        for (const data of markers) {
          const marker = L.marker([data.position.lat, data.position.lng], {
            icon: iconFor(data),
            title: data.title,
            alt: data.title,
            keyboard: options.interactive && data.kind === "listing",
            riseOnHover: true,
          })
          if (data.kind === "listing") {
            marker.on("click", () => events.onMarkerClick?.(data.id))
            marker.on("mouseover", () => events.onMarkerHover?.(data.id))
            marker.on("mouseout", () => events.onMarkerHover?.(null))
          }
          marker.addTo(layer)
          byId.set(data.id, { marker, data })
        }
        applyActive()
      },
      setActive(next) {
        activeId = next
        applyActive()
      },
      fitToMarkers(padding = 48) {
        const points = [...byId.values()].map(({ data }) => L.latLng(data.position.lat, data.position.lng))
        if (points.length === 0) return
        if (points.length === 1) {
          map.setView(points[0], 15)
          return
        }
        map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 15 })
      },
      setView(center, zoom) {
        map.setView([center.lat, center.lng], zoom)
      },
      invalidateSize() {
        map.invalidateSize()
      },
      destroy() {
        map.remove()
      },
    }
  },
}
