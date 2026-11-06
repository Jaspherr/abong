import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgeCheck, ExternalLink, Globe, Loader2 } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { UserAvatar } from "@/components/common/user-avatar"
import { FormField } from "@/components/forms/form-field"
import { ErrorState } from "@/components/feedback/states"
import { SignOutButton } from "@/components/layout/sign-out-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { useAuth } from "@/features/auth/auth-context"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useFormState } from "@/hooks/use-form-state"
import { qk } from "@/lib/query"
import { landlordsService } from "@/services"
import type { LandlordProfile } from "@/types"

const LANGUAGES = ["Pangasinan", "Ilocano", "Filipino", "English"]

interface Values extends Record<string, unknown> {
  displayName: string
  businessName: string
  bio: string
  languages: string[]
}

const validate = (v: Values) => {
  const e: Partial<Record<keyof Values, string>> = {}
  if (v.displayName.trim().length < 3) e.displayName = "Enter the name renters will see."
  if (v.bio.trim().length > 0 && v.bio.trim().length < 30) e.bio = "Write a bit more (30+ characters), or leave it empty."
  if (!v.languages.length) e.languages = "Pick at least one language."
  return e
}

function ProfileForm({ profile }: { profile: LandlordProfile }) {
  const client = useQueryClient()
  const form = useFormState<Values>(
    { displayName: profile.displayName, businessName: profile.businessName ?? "", bio: profile.bio, languages: profile.languages },
    validate,
  )
  const { values, set, blur, errorFor } = form
  const save = useMutation({
    mutationFn: () =>
      landlordsService.updateProfile(profile.id, {
        displayName: values.displayName.trim(),
        businessName: values.businessName.trim() || undefined,
        bio: values.bio.trim(),
        languages: values.languages,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["landlords"] })
      client.invalidateQueries({ queryKey: ["listings"] })
      toast.success("Profile saved")
    },
    onError: () => toast.error("Couldn't save your profile. Try again."),
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (form.attempt()) save.mutate()
      }}
      className="min-w-0 space-y-6"
    >
      <div className="space-y-1">
        <h2 className="type-subsection">Public profile</h2>
        <p className="text-body text-muted-foreground">Shown on your listings and landlord page.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Display name" required error={errorFor("displayName")}>
          <Input value={values.displayName} onChange={(e) => set("displayName", e.target.value)} onBlur={() => blur("displayName")} />
        </FormField>
        <FormField label="Business name" optional>
          <Input value={values.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </FormField>
      </div>
      <FormField label="About you" error={errorFor("bio")} hint="How long you've rented out, who usually stays, and how the place is run.">
        <Textarea rows={5} value={values.bio} onChange={(e) => set("bio", e.target.value)} onBlur={() => blur("bio")} maxLength={600} />
      </FormField>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Languages you speak</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {LANGUAGES.map((lang) => (
            <Label key={lang} className="flex items-center gap-2.5 font-normal">
              <Checkbox
                checked={values.languages.includes(lang)}
                onCheckedChange={(on) => set("languages", on ? [...values.languages, lang] : values.languages.filter((l) => l !== lang))}
              />
              {lang}
            </Label>
          ))}
        </div>
        {errorFor("languages") && <p className="mt-2 text-meta text-destructive">{errorFor("languages")}</p>}
      </fieldset>
      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Save profile
        </Button>
      </div>
    </form>
  )
}

function LandlordProfilePage() {
  useDocumentTitle("Profile")
  const { user } = useAuth()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.landlordMe(user!.id),
    queryFn: () => landlordsService.getProfileByUser(user!.id),
  })
  const linkClass = "-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-muted"

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-8">
      <PageHeader title="Profile" description="Renters read this before they message you." actions={<SignOutButton />} />
      {isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 border-t border-border pt-7 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <aside className="space-y-5">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <UserAvatar name={data.displayName} className="size-14 text-lead lg:size-20 lg:rounded-2xl" />
              <div className="min-w-0">
                <p className="truncate type-card-title">{data.displayName}</p>
                <p className="truncate text-meta text-muted-foreground">{user!.email}</p>
                <p className="text-meta text-muted-foreground">Landlord account</p>
              </div>
            </div>
            <nav aria-label="Account links" className="border-t border-border pt-3">
              <Link to={PATHS.landlord.verification} className={linkClass}>
                <BadgeCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Verification
              </Link>
              <Link to={PATHS.landlordProfile(data.id)} className={linkClass}>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                View public page
              </Link>
              <Link to="/" className={linkClass}>
                <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                View public site
              </Link>
            </nav>
          </aside>
          <ProfileForm profile={data} />
        </div>
      )}
    </div>
  )
}

export { LandlordProfilePage as Component }
