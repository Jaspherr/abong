import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/auth-context"
import { qk } from "@/lib/query"
import { ServiceError, inquiriesService, propertiesService, rentalsService, verificationService, viewingsService } from "@/services"

/** The signed-in landlord's profile id. Landlord routes are guarded, so it is always present there. */
export function useLandlordId() {
  const { session } = useAuth()
  return session?.landlordProfile?.id ?? ""
}

export function useLandlordProperties() {
  const id = useLandlordId()
  return useQuery({ queryKey: qk.landlordProperties(id), queryFn: () => propertiesService.listForLandlord(id), enabled: Boolean(id) })
}

export function useLandlordProperty(propertyId: string) {
  const id = useLandlordId()
  return useQuery({ queryKey: qk.landlordProperty(id, propertyId), queryFn: () => propertiesService.get(id, propertyId), enabled: Boolean(id) })
}

export function useLandlordInquiries() {
  const id = useLandlordId()
  return useQuery({ queryKey: qk.landlordInquiries(id), queryFn: () => inquiriesService.listForLandlord(id), enabled: Boolean(id) })
}

export function useLandlordViewings() {
  const id = useLandlordId()
  return useQuery({ queryKey: qk.landlordViewings(id), queryFn: () => viewingsService.listForLandlord(id), enabled: Boolean(id) })
}

export function useLandlordVerification() {
  const id = useLandlordId()
  return useQuery({ queryKey: qk.verification(id), queryFn: () => verificationService.getForLandlord(id), enabled: Boolean(id) })
}

/** Stays recorded at the landlord's places. Shares its cache with the Renters page. */
export function useLandlordRentals() {
  const { user } = useAuth()
  return useQuery({ queryKey: qk.myRentals(user?.id ?? ""), queryFn: rentalsService.listMine, enabled: Boolean(user) })
}

/** Property changes affect public listings and town and school counts too, so all three are refreshed. */
export function useInvalidateProperties() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["properties"] }),
      client.invalidateQueries({ queryKey: ["listings"] }),
      client.invalidateQueries({ queryKey: ["places"] }),
    ])
}

export function usePropertyAction<TArgs, TResult>(fn: (landlordId: string, args: TArgs) => Promise<TResult>) {
  const landlordId = useLandlordId()
  const invalidate = useInvalidateProperties()
  return useMutation({
    mutationFn: (args: TArgs) => fn(landlordId, args),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof ServiceError ? error.message : "That didn't save. Try again."),
  })
}
