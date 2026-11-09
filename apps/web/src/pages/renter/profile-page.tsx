
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { FormField } from "@/components/forms/form-field"
import { SignOutButton } from "@/components/layout/sign-out-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useAuth } from "@/features/auth/auth-context"
import { ProfilePhotoControl } from "@/features/profile/profile-photo-control"
import {
  useMunicipalities,
  useUniversities,
} from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import {
  isPhMobile,
  useFormState,
} from "@/hooks/use-form-state"
import { formatDate } from "@/lib/format"
import { authService } from "@/services"
import type { RenterOccupation } from "@/types"

const NONE = "none"
const ANY_TOWN = "any-town"

interface Values extends Record<string, unknown> {
  name: string
  phone: string
  municipalityId: string
  occupation: RenterOccupation
  universityId: string
  workplace: string
  budgetMax: string
  moveInBy: string
  bio: string
}

const validate = (values: Values) => {
  const errors: Partial<Record<keyof Values, string>> = {}

  if (values.name.trim().length < 3) {
    errors.name = "Enter your full name."
  }

  if (!isPhMobile(values.phone)) {
    errors.phone = "Use a PH mobile number, e.g. 0917 123 4567."
  }

  if (
    values.budgetMax &&
    !/^\d+$/.test(values.budgetMax)
  ) {
    errors.budgetMax = "Numbers only."
  }

  return errors
}

const inputClassName =
  "h-11 rounded-xl border-border/80 bg-background px-4 text-sm shadow-none transition-colors focus-visible:border-primary"

const selectClassName =
  "h-11 w-full rounded-xl border-border/80 bg-background px-4 text-sm shadow-none"

// ============================================================
// RENTER PROFILE
// ============================================================

function RenterProfilePage() {
  useDocumentTitle("Profile")

  const { session, setSession } = useAuth()

  const user = session!.user
  const profile = session!.renterProfile

  const { data: towns = [] } = useMunicipalities()
  const { data: schools = [] } = useUniversities()

  const [saving, setSaving] = useState(false)

  const form = useFormState<Values>(
    {
      name: user.name,
      phone: user.phone,
      municipalityId: user.municipalityId ?? "",
      occupation: profile?.occupation ?? "student",
      universityId: profile?.universityId ?? NONE,
      workplace: profile?.workplace ?? "",
      budgetMax: profile?.budgetMax
        ? String(profile.budgetMax)
        : "",
      moveInBy: profile?.moveInBy ?? "",
      bio: profile?.bio ?? "",
    },
    validate,
  )

  const { values, set, blur, errorFor } = form

  // ----------------------------------------------------------
  // SAVE PROFILE
  // ----------------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!form.attempt() || saving) return

    setSaving(true)

    try {
      const next = await authService.updateRenterProfile(
        user.id,
        {
          name: values.name.trim(),
          phone: values.phone.trim(),

          municipalityId:
            values.municipalityId || undefined,

          occupation: values.occupation,

          universityId:
            values.universityId === NONE
              ? undefined
              : values.universityId,

          workplace:
            values.workplace.trim() || undefined,

          budgetMax:
            values.budgetMax
              ? Number(values.budgetMax)
              : undefined,

          moveInBy: values.moveInBy || undefined,

          bio: values.bio.trim() || undefined,
        },
      )

      setSession(next)
      toast.success("Profile saved")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't save your profile. Please try again.",
      )
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------

  return (
    <div className="min-w-0 pb-12">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-10">

        <div className="max-w-xl">

          <h1 className="type-page-title text-foreground">
            Profile<span className="text-primary">.</span>
          </h1>

          <p className="mt-3 text-body text-muted-foreground">
            Keep your personal details and rental preferences
            up to date, all in one place.
          </p>
        </div>

        {/* Existing sign-out functionality */}
        <div className="shrink-0">
          <SignOutButton />
        </div>
      </header>

      {/* =====================================================
          PROFILE WORKSPACE
      ===================================================== */}
      <div className="grid min-w-0 gap-10 pt-9 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12 lg:pt-12 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:gap-16">

        {/* =================================================
            LEFT — PROFILE IDENTITY
        ================================================= */}
        <aside className="min-w-0 lg:sticky lg:top-28 lg:h-fit">

          {/* Identity */}
          <ProfilePhotoControl name={values.name.trim() || user.name}>
            <div className="min-w-0">
              <span className="text-caption font-semibold text-primary">
                Renter account
              </span>

              <h2 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {values.name.trim() || "Your name"}
              </h2>

              <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                {user.email}
              </p>
            </div>
          </ProfilePhotoControl>

          {/* Account information */}
          <div className="mt-7 border-t border-border pt-6 lg:mt-9">
            <dl className="grid gap-5">

              <div className="flex items-start justify-between gap-4 lg:block">
                <dt className="text-xs font-medium text-muted-foreground">
                  Account type
                </dt>

                <dd className="text-sm font-semibold text-foreground lg:mt-1.5">
                  Renter
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4 lg:block">
                <dt className="text-xs font-medium text-muted-foreground">
                  Member since
                </dt>

                <dd className="text-sm font-semibold text-foreground lg:mt-1.5">
                  {formatDate(user.joinedAt, "MMMM yyyy")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Contextual information */}
          <div className="mt-8 border-l-2 border-primary bg-muted/40 px-4 py-4 lg:mt-10">
            <p className="text-xs font-semibold text-foreground">
              A little about your profile
            </p>

            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Your name and renter details help landlords
              understand your inquiry when you contact them.
              Keep your information accurate and relevant.
            </p>
          </div>
        </aside>

        {/* =================================================
            RIGHT — EDIT PROFILE
        ================================================= */}
        <div className="min-w-0">
          <form noValidate onSubmit={handleSubmit}>

            {/* =============================================
                PERSONAL INFORMATION
            ============================================= */}
            <section
              aria-labelledby="personal-details-title"
              className="border-b border-border pb-10"
            >
              <div className="mb-7">
                <h2
                  id="personal-details-title"
                  className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                >
                  Personal information
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The basic details associated with your account.
                </p>
              </div>

              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">

                {/* Full name */}
                <FormField
                  label="Full name"
                  required
                  error={errorFor("name")}
                >
                  <Input
                    value={values.name}
                    autoComplete="name"
                    placeholder="Your full name"
                    className={inputClassName}
                    onChange={(event) =>
                      set("name", event.target.value)
                    }
                    onBlur={() => blur("name")}
                  />
                </FormField>

                {/* Email address */}
                <FormField
                  label="Email address"
                  hint="Contact support to change your email."
                >
                  <Input
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    className="h-11 rounded-xl border-border/60 bg-muted/50 px-4 text-sm text-muted-foreground shadow-none"
                  />
                </FormField>

                {/* Mobile number */}
                <FormField
                  label="Mobile number"
                  required
                  error={errorFor("phone")}
                >
                  <Input
                    type="tel"
                    value={values.phone}
                    autoComplete="tel"
                    placeholder="0917 123 4567"
                    className={inputClassName}
                    onChange={(event) =>
                      set("phone", event.target.value)
                    }
                    onBlur={() => blur("phone")}
                  />
                </FormField>
              </div>
            </section>

            {/* =============================================
                RENTAL PREFERENCES
            ============================================= */}
            <section
              aria-labelledby="rental-preferences-title"
              className="border-b border-border py-10"
            >
              <div className="mb-7">
                <h2
                  id="rental-preferences-title"
                  className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                >
                  Rental preferences
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Tell us what you're looking for. These details
                  help personalize your rental experience and
                  make inquiries more informative.
                </p>
              </div>

              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">

                {/* Occupation */}
                <FormField label="I'm a">
                  <Select
                    value={values.occupation}
                    onValueChange={(value) =>
                      set(
                        "occupation",
                        value as RenterOccupation,
                      )
                    }
                  >
                    <SelectTrigger className={selectClassName}>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="student">
                        Student
                      </SelectItem>

                      <SelectItem value="professional">
                        Working professional
                      </SelectItem>

                      <SelectItem value="family">
                        Family
                      </SelectItem>

                      <SelectItem value="other">
                        Something else
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Preferred town */}
                <FormField
                  label="Preferred town"
                  optional
                >
                  <Select
                    value={values.municipalityId || ANY_TOWN}
                    onValueChange={(value) =>
                      set(
                        "municipalityId",
                        value === ANY_TOWN ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger className={selectClassName}>
                      <SelectValue placeholder="Any town" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={ANY_TOWN}>
                        Any town
                      </SelectItem>

                      {towns.map((town) => (
                        <SelectItem
                          key={town.id}
                          value={town.id}
                        >
                          {town.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {/* School or workplace */}
                {values.occupation === "student" ? (
                  <FormField
                    label="School"
                    optional
                  >
                    <Select
                      value={values.universityId}
                      onValueChange={(value) =>
                        set("universityId", value)
                      }
                    >
                      <SelectTrigger className={selectClassName}>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={NONE}>
                          Not listed
                        </SelectItem>

                        {schools.map((school) => (
                          <SelectItem
                            key={school.id}
                            value={school.id}
                          >
                            {school.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : (
                  <FormField
                    label="Workplace"
                    optional
                  >
                    <Input
                      value={values.workplace}
                      placeholder="e.g. Region 1 Medical Center"
                      className={inputClassName}
                      onChange={(event) =>
                        set(
                          "workplace",
                          event.target.value,
                        )
                      }
                    />
                  </FormField>
                )}

                {/* Monthly budget */}
                <FormField
                  label="Monthly budget up to"
                  optional
                  error={errorFor("budgetMax")}
                >
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
                    >
                      ₱
                    </span>

                    <Input
                      inputMode="numeric"
                      value={values.budgetMax}
                      placeholder="e.g. 5,000"
                      className={`${inputClassName} pl-9`}
                      onChange={(event) =>
                        set(
                          "budgetMax",
                          event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        )
                      }
                      onBlur={() =>
                        blur("budgetMax")
                      }
                    />
                  </div>
                </FormField>

                {/* Move-in date */}
                <FormField
                  label="Move in by"
                  optional
                >
                  <Input
                    type="date"
                    value={values.moveInBy}
                    className={inputClassName}
                    onChange={(event) =>
                      set(
                        "moveInBy",
                        event.target.value,
                      )
                    }
                  />
                </FormField>
              </div>
            </section>

            {/* =============================================
                ABOUT YOU
            ============================================= */}
            <section
              aria-labelledby="about-you-title"
              className="py-10"
            >
              <div className="mb-7">
                <h2
                  id="about-you-title"
                  className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                >
                  About you
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Add a short introduction to help landlords
                  get to know you when you send an inquiry.
                </p>
              </div>

              <FormField
                label="Your introduction"
                optional
                hint="One or two lines landlords see with your first message."
              >
                <Textarea
                  value={values.bio}
                  rows={5}
                  maxLength={300}
                  placeholder="Tell landlords a little about yourself and what you're looking for..."
                  className="min-h-32 resize-y rounded-xl border-border/80 bg-background px-4 py-3 text-sm leading-7 shadow-none focus-visible:border-primary"
                  onChange={(event) =>
                    set("bio", event.target.value)
                  }
                />
              </FormField>

              <div className="mt-2 flex justify-end">
                <span className="text-caption text-muted-foreground tabular-nums">
                  {values.bio.length} / 300 characters
                </span>
              </div>
            </section>

            {/* =============================================
                SAVE ACTION
            ============================================= */}
            <div className="flex flex-col gap-5 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between">

              <div className="max-w-sm">
                <p className="text-sm font-medium text-foreground">
                  Keep your details up to date
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Save your changes when you're finished editing.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={saving}
                className="h-11 w-full shrink-0 gap-2 rounded-xl px-7 text-sm font-semibold sm:w-auto"
              >
                {saving && (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Saving changes..."
                  : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export { RenterProfilePage as Component }
