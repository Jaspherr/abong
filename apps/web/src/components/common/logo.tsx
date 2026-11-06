import { Link } from "react-router"
import { BRAND } from "@/constants/app"
import { cn } from "@/lib/utils"

/** Arched doorway mark: an open door rather than the usual roof outline. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--brand-green)" />
      <path d="M9.5 26V15.5a6.5 6.5 0 0 1 13 0V26Z" fill="var(--primary-foreground)" />
      <path d="M13.5 26v-8.5a2.5 2.5 0 0 1 5 0V26Z" fill="var(--brand-green-deep)" />
    </svg>
  )
}

export function Logo({
  className,
  to = "/",
  tone = "default",
  suffix,
}: {
  className?: string
  to?: string
  tone?: "default" | "inverse"
  suffix?: string
}) {
  return (
    <Link
      to={to}
      className={cn("group inline-flex items-center gap-2 rounded-lg focus-visible:outline-offset-4", className)}
      aria-label={`${BRAND.name} home`}
    >
      <LogoMark />
      <span
        className={cn(
          "font-heading text-[1.375rem] leading-none font-[700] tracking-[-0.04em]",
          tone === "inverse" ? "text-white" : "text-ink",
        )}
      >
        abong
      </span>
      {suffix && (
        <span
          className={cn(
            "ml-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
            tone === "inverse" ? "bg-white/12 text-white/85" : "bg-secondary text-secondary-foreground",
          )}
        >
          {suffix}
        </span>
      )}
    </Link>
  )
}
