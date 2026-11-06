import { useEffect } from "react"
import { BRAND } from "@/constants/app"

/** Sets the tab title; pages pass their own name, the home page passes nothing. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND.name}` : `${BRAND.name}: ${BRAND.tagline}`
  }, [title])
}
