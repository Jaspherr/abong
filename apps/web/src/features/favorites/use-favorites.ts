import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { qk } from "@/lib/query"
import { favoritesService } from "@/services"
import type { Favorite } from "@/types"

export function useFavorites() {
  return useQuery({ queryKey: qk.favorites, queryFn: favoritesService.list })
}

export function useFavoriteIds() {
  const { data } = useFavorites()
  return useMemo(() => new Set((data ?? []).map((f) => f.listingId)), [data])
}

/** Removes several saved places in one step: one optimistic update, one rollback, one toast. */
export function useRemoveFavorites() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await favoritesService.toggle(id)
    },
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: qk.favorites })
      const previous = client.getQueryData<Favorite[]>(qk.favorites) ?? []
      client.setQueryData<Favorite[]>(qk.favorites, previous.filter((f) => !ids.includes(f.listingId)))
      return { previous }
    },
    onError: (_error, _ids, context) => {
      client.setQueryData(qk.favorites, context?.previous)
      toast.error("Couldn't update your saved places. Try again.")
    },
    onSuccess: (_data, ids) => {
      toast.success(ids.length === 1 ? "Removed 1 place that's no longer listed" : `Removed ${ids.length} places that are no longer listed`)
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.favorites }),
  })
}

/** Optimistic toggle: the heart responds instantly and rolls back on failure. */
export function useToggleFavorite() {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: ({ listingId }: { listingId: string; name: string }) => favoritesService.toggle(listingId),
    onMutate: async ({ listingId }) => {
      await client.cancelQueries({ queryKey: qk.favorites })
      const previous = client.getQueryData<Favorite[]>(qk.favorites) ?? []
      const exists = previous.some((f) => f.listingId === listingId)
      client.setQueryData<Favorite[]>(
        qk.favorites,
        exists
          ? previous.filter((f) => f.listingId !== listingId)
          : [{ listingId, savedAt: new Date().toISOString() }, ...previous],
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      client.setQueryData(qk.favorites, context?.previous)
      toast.error("Couldn't update your saved places. Try again.")
    },
    onSuccess: ({ saved }, { name }) => {
      toast.success(saved ? `Saved ${name}` : `Removed ${name} from saved`, {
        action: saved ? { label: "View saved", onClick: () => navigate("/favorites") } : undefined,
      })
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.favorites }),
  })
}
