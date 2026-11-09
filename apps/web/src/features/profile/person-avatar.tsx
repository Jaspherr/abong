import { useQuery } from "@tanstack/react-query"
import { UserAvatar } from "@/components/common/user-avatar"
import { useAuth } from "@/features/auth/auth-context"
import { qk } from "@/lib/query"
import { profilePhotosService } from "@/services"

/**
 * UserAvatar for a known account: shows their photo when they have one and the
 * signed-in viewer is allowed to see it, and their initials otherwise.
 */
export function PersonAvatar({ userId, name, className }: { userId?: string; name: string; className?: string }) {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: qk.photo(user?.id, userId ?? ""),
    queryFn: () => profilePhotosService.get(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
  return <UserAvatar name={name} src={data} className={className} />
}
