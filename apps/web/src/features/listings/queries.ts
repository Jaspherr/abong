import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { listingsService, locationsService } from "@/services"
import type { SearchFilters } from "@/types"

export function useSearchListings(filters: SearchFilters) {
  return useQuery({
    queryKey: qk.search(filters),
    queryFn: () => listingsService.search(filters),
    placeholderData: keepPreviousData,
  })
}

export function useListing(id: string) {
  return useQuery({ queryKey: qk.listing(id), queryFn: () => listingsService.getListing(id) })
}

export function useListings(ids: string[]) {
  return useQuery({
    queryKey: qk.listingsMany(ids),
    queryFn: () => listingsService.getMany(ids),
    placeholderData: keepPreviousData,
  })
}

export function useFeaturedListings() {
  return useQuery({ queryKey: qk.featured, queryFn: () => listingsService.getFeatured(6) })
}

export function useSimilarListings(id: string) {
  return useQuery({ queryKey: qk.similar(id), queryFn: () => listingsService.getSimilar(id, 4) })
}

export function useNearbyPlaces(id: string) {
  return useQuery({ queryKey: qk.nearby(id), queryFn: () => listingsService.getNearbyPlaces(id) })
}

export function useMunicipalities() {
  return useQuery({ queryKey: qk.municipalities, queryFn: locationsService.listMunicipalities })
}

export function useUniversities() {
  return useQuery({ queryKey: qk.universities, queryFn: locationsService.listUniversities })
}
