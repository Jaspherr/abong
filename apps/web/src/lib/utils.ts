import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge has to know about the type scale in index.css. Without this it
 * reads `text-meta` as a colour and drops it when merged with `text-warning`.
 */
const twMerge = extendTailwindMerge<"type-role">({
  extend: {
    theme: {
      text: ["caption", "meta", "body", "lead", "price", "metric"],
    },
    classGroups: {
      "type-role": ["type-display", "type-page-title", "type-section-title", "type-subsection", "type-card-title"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
