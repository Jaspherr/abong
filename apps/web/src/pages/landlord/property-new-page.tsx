import { ArrowLeft } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { PATHS } from "@/constants/app"
import { PropertyForm } from "@/features/landlord/property-form"
import { useInvalidateProperties, useLandlordId } from "@/features/landlord/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { propertiesService } from "@/services"

function PropertyNewPage() {
  useDocumentTitle("Add property")
  const landlordId = useLandlordId()
  const navigate = useNavigate()
  const invalidate = useInvalidateProperties()

  return (
    <div className="space-y-6 pb-8">
      <Link to={PATHS.landlord.properties} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Properties
      </Link>
      <PageHeader title="Add a property" description="Describe the building or house first. You'll add rooms and units on the next step." />
      <PropertyForm
        submitLabel="Save and add units"
        secondaryLabel="Save as draft"
        cancelTo={PATHS.landlord.properties}
        onSubmit={async (draft, intent) => {
          try {
            const created = await propertiesService.create(landlordId, draft, false)
            await invalidate()
            toast.success(intent === "primary" ? `${created.name} created. Now add your units.` : `${created.name} saved as a draft`)
            navigate(intent === "primary" ? PATHS.landlord.property(created.id) : PATHS.landlord.properties)
          } catch {
            toast.error("Couldn't save the property. Try again.")
          }
        }}
      />
    </div>
  )
}

export { PropertyNewPage as Component }
