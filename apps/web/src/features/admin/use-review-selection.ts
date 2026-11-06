import { useCallback, useEffect } from "react"
import { useSearchParams } from "react-router"
import { useIsDesktop } from "@/hooks/use-media-query"

/**
 * The item open in a review queue, kept in the URL so it can be linked to.
 * With the two panes side by side, the first item opens by itself and a decision moves on to
 * the next one. On small screens the review is a sheet, so it only opens when asked and a decision closes it.
 */
export function useReviewSelection(ids: string[], ready: boolean) {
  const [params, setParams] = useSearchParams()
  const reviewId = params.get("review")
  const split = useIsDesktop()
  const first = ids[0]

  const setReview = useCallback(
    (id: string | null) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          if (id) next.set("review", id)
          else next.delete("review")
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => {
    if (ready && split && !reviewId && first) setReview(first)
  }, [ready, split, reviewId, first, setReview])

  /** Call after a decision that takes an item out of the queue, once the data has refreshed. */
  const advance = (fromId: string, previousIds: string[]) => {
    const i = previousIds.indexOf(fromId)
    setReview(split ? (previousIds[i + 1] ?? previousIds[i - 1] ?? null) : null)
  }

  return { reviewId, setReview, advance }
}
