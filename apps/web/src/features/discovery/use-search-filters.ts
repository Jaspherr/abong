import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import type { SearchFilters } from "@/types"
import { parseFilters, serializeFilters } from "./search-params"

export function useSearchFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  const update = useCallback(
    (patch: Partial<SearchFilters>) => {
      setParams((current) => serializeFilters({ ...parseFilters(current), ...patch }), { replace: true })
    },
    [setParams],
  )

  const replaceAll = useCallback(
    (next: SearchFilters) => setParams(serializeFilters(next), { replace: true }),
    [setParams],
  )

  return { filters, update, replaceAll }
}
