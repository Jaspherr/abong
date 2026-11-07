import { Link } from "react-router"
import { formatPeso, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MunicipalityWithCount } from "@/services"
import { searchUrl } from "./search-params"

/*
 * A stylised map of central and western Pangasinan. The coastline is
 * simplified by hand; towns are placed from real coordinates using an
 * equirectangular projection corrected for latitude (~16°N).
 */
const BOUNDS = { west: 119.9, east: 120.66, north: 16.3, south: 15.76 }
const X_SCALE = 576 // px per degree longitude (600 × cos 16°)
const Y_SCALE = 600 // px per degree latitude
const WIDTH = (BOUNDS.east - BOUNDS.west) * X_SCALE
const HEIGHT = (BOUNDS.north - BOUNDS.south) * Y_SCALE

const project = (lat: number, lng: number) => ({
  x: (lng - BOUNDS.west) * X_SCALE,
  y: (BOUNDS.north - lat) * Y_SCALE,
})

const toPath = (points: Array<[number, number]>) =>
  points
    .map(([lat, lng], i) => {
      const { x, y } = project(lat, lng)
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ") + " Z"

const GULF: Array<[number, number]> = [
  [16.45, 119.93], [16.38, 119.95], [16.3, 120.02], [16.2, 120.01], [16.12, 120.06], [16.07, 120.1],
  [16.04, 120.15], [16.04, 120.22], [16.055, 120.28], [16.075, 120.33], [16.1, 120.37], [16.14, 120.4],
  [16.24, 120.41], [16.33, 120.36], [16.45, 120.33],
]

const WEST_SEA: Array<[number, number]> = [
  [16.45, 119.85], [16.39, 119.87], [16.25, 119.92], [16.13, 119.94], [15.99, 119.88], [15.75, 119.86], [15.75, 119.85],
]

/** Label side per town, chosen by hand where neighbours would collide. */
const LABEL_SIDE: Record<string, "left" | "right" | "top" | "bottom"> = {
  lingayen: "left",
  binmaley: "bottom",
  dagupan: "top",
  calasiao: "right",
  mangaldan: "right",
  urdaneta: "left",
  villasis: "left",
}

const LABEL_POSITION = {
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-1 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1 -translate-x-1/2",
} as const

export function GulfMap({ towns, className }: { towns: MunicipalityWithCount[]; className?: string }) {
  const max = Math.max(1, ...towns.map((t) => t.listingCount))

  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <pattern id="gulf-lines" width="14" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4 Q3.5 1 7 4 T14 4" fill="none" stroke="#a9c4c9" strokeWidth="0.9" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="#e9eee9" />
        <path d={toPath(GULF)} fill="#c6d7da" />
        <path d={toPath(GULF)} fill="url(#gulf-lines)" opacity="0.7" />
        <path d={toPath(WEST_SEA)} fill="#c6d7da" />
        <text
          x={project(16.22, 120.2).x}
          y={project(16.22, 120.2).y}
          className="fill-[#3f6c76] font-heading text-body font-semibold"
          textAnchor="middle"
        >
          Lingayen Gulf
        </text>
      </svg>

      {towns.map((town) => {
        const { x, y } = project(town.coordinates.lat, town.coordinates.lng)
        const size = 10 + (town.listingCount / max) * 14
        const side = LABEL_SIDE[town.id] ?? "right"
        return (
          <Link
            key={town.id}
            to={searchUrl({ location: town.slug })}
            // The pin can be as small as 10px; the link stays 24px so it's easy to tap.
            className="group absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }}
            aria-label={`${town.name}: ${pluralize(town.listingCount, "listing")}${town.priceFrom ? `, from ${formatPeso(town.priceFrom)}` : ""}`}
          >
            <span
              className="block rounded-full border-[2.5px] border-white bg-primary shadow-[0_1px_3px_rgb(20_37_43/0.35)] transition-transform motion-safe:group-hover:scale-115 motion-safe:group-focus-visible:scale-115"
              style={{ width: size, height: size }}
            />
            <span
              className={cn(
                "pointer-events-none absolute text-caption font-semibold whitespace-nowrap text-ink sm:text-xs",
                LABEL_POSITION[side],
              )}
            >
              <span className="rounded-sm bg-[#e9eee9]/90 px-0.5">{town.name.replace(" City", "")}</span>
              <span className="ml-1 hidden rounded-sm bg-ink px-1.5 py-0.5 text-caption font-semibold text-white transition-opacity group-hover:inline-block group-focus-visible:inline-block starting:opacity-0">
                {town.listingCount}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
