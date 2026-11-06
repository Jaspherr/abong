import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const PALETTE = [
  "bg-[#d7ebe8] text-[#0a4d4f]",
  "bg-[#fdebc8] text-[#6b4500]",
  "bg-[#e3e8f4] text-[#2b4170]",
  "bg-[#f2e1dc] text-[#7a3424]",
  "bg-[#e6eedc] text-[#3d5520]",
]

/** Initials avatar. Demo accounts never use photos of real people. */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center rounded-full text-meta font-semibold",
        PALETTE[hash % PALETTE.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
