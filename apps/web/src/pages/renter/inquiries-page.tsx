import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { Inbox } from "@/features/inquiries/inbox"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { qk } from "@/lib/query"
import { inquiriesService } from "@/services"

function RenterInquiriesPage() {
  useDocumentTitle("Inquiries")
  const { user } = useAuth()
  const userId = user!.id
  const { data, isPending } = useQuery({ queryKey: qk.renterInquiries(userId), queryFn: () => inquiriesService.listForRenter(userId) })

  return (
    <div className="space-y-6">
      <PageHeader title="Inquiries" description="Your conversations with landlords. Replies usually arrive within a day." />
      <Inbox
        threads={data}
        isPending={isPending}
        perspective="renter"
        currentUserId={userId}
        emptyAction={
          <Button asChild>
            <Link to={PATHS.search}>Find a place</Link>
          </Button>
        }
      />
    </div>
  )
}

export { RenterInquiriesPage as Component }
