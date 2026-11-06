import { useId, useMemo, useState } from "react"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * Lightweight SVG charts for admin views. Single-series by design (one hue,
 * no legend needed), 2px lines, recessive grid, hover crosshair + tooltip.
 */

interface Point {
  label: string
  value: number
}

const niceMax = (max: number) => {
  const pow = 10 ** Math.floor(Math.log10(Math.max(1, max)))
  return Math.ceil(max / pow) * pow
}

export function Sparkline({ values, className, label }: { values: number[]; className?: string; label: string }) {
  const w = 100
  const h = 28
  const max = Math.max(...values)
  const min = Math.min(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / Math.max(1, max - min)) * (h - 4)])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full", className)} role="img" aria-label={label}>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill="var(--chart-1)" opacity="0.1" />
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function TrendChart({ data, title, height = 200, unit = "" }: { data: Point[]; title: string; height?: number; unit?: string }) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const W = 600
  const H = height
  const pad = { top: 12, right: 12, bottom: 26, left: 36 }
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = [0, max / 2, max]
  const x = (i: number) => pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - v / max) * (H - pad.top - pad.bottom)
  const path = useMemo(() => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" "), [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * (W - pad.left - pad.right)
    setHover(Math.max(0, Math.min(data.length - 1, Math.round((rel / (W - pad.left - pad.right)) * (data.length - 1)))))
  }

  const active = hover !== null ? data[hover] : null

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-caption tabular">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {/* Every third label, counted back from the latest point so "now" is always labelled. */}
        {data.map((d, i) =>
          (data.length - 1 - i) % 3 === 0 ? (
            <text key={d.label} x={x(i)} y={H - 6} textAnchor={i === data.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="fill-muted-foreground text-caption">
              {d.label}
            </text>
          ) : null,
        )}
        <path d={`${path} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="var(--chart-1)" opacity="0.08" />
        <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && active && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={H - pad.bottom} stroke="var(--foreground)" strokeOpacity="0.25" />
            <circle cx={x(hover)} cy={y(active.value)} r="5" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
        <rect
          x={pad.left}
          y={pad.top}
          width={W - pad.left - pad.right}
          height={H - pad.top - pad.bottom}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-raised"
          style={{ left: `${(x(hover) / W) * 100}%` }}
          role="status"
        >
          <span className="text-white/70">{active.label}: </span>
          <span className="font-semibold tabular">
            {formatNumber(active.value)}
            {unit}
          </span>
        </div>
      )}
    </figure>
  )
}

/** Horizontal bars with direct labels; values are text, not colour. */
export function BarList({ data, valueLabel = (v: number) => formatNumber(v) }: { data: Point[]; valueLabel?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm" title={`${d.label}: ${valueLabel(d.value)}`}>
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-chart-1" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="w-8 text-right font-medium tabular">{valueLabel(d.value)}</span>
        </li>
      ))}
    </ul>
  )
}
