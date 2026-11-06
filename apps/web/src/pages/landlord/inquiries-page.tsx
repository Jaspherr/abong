import { PageHeader } from "@/components/common/page-header"
import { useAuth } from "@/features/auth/auth-context"
import { Inbox } from "@/features/inquiries/inbox"
import { useLandlordInquiries } from "@/features/landlord/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"

function LandlordInquiriesPage() {
  useDocumentTitle("Inquiries")
  const { user } = useAuth()
  const { data, isPending } = useLandlordInquiries()
  const unread = data?.filter((t) => t.unreadForLandlord > 0).length ?? 0

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Inquiries"
        description={unread ? `${unread} waiting for your reply. Quick replies keep your response rate high.` : "You're all caught up."}
      />
      <Inbox threads={data} isPending={isPending} perspective="landlord" currentUserId={user!.id} />
    </div>
  )
}

export { LandlordInquiriesPage as Component }
