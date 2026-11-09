import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const PALETTE = [
  "bg-[#d7ebe8] text-[#0a4d4f]",
  "bg-[#fdebc8] text-[#6b4500]",
  "bg-[#e3e8f4] text-[#2b4170]",
  "bg-[#f2e1dc] text-[#7a3424]",
  "bg-[#e6eedc] text-[#3d5520]",
]

/**
 * A person's photo, or their initials when there is no photo (or it can't be shown).
 * Decorative: the name always appears next to it, so screen readers skip it.
 */
export function UserAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-full text-meta font-semibold",
        PALETTE[hash % PALETTE.length],
        className,
      )}
    >
      {initials(name)}
      {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />}
    </span>
  )
}
