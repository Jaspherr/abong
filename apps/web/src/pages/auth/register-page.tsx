import { Building2, Check, Loader2, UserRound } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { FormField } from "@/components/forms/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PATHS } from "@/constants/app"
import { homeForRole, useAuth } from "@/features/auth/auth-context"
import { safeNext } from "@/features/auth/safe-next"
import { PasswordInput } from "@/features/auth/password-input"
import { useMunicipalities } from "@/features/listings/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isEmail, isPhMobile, useFormState } from "@/hooks/use-form-state"
import { cn } from "@/lib/utils"

import type { RenterOccupation } from "@/types"

type Role = "renter" | "landlord"

const NONE = ""

const OCCUPATIONS: Record<RenterOccupation, string> = {
  student: "Student",
  professional: "Working professional",
  family: "Family",
  other: "Something else",
}

const ROLE_OPTIONS = [
  {
    value: "renter",
    title: "Find a place",
    description: "Rooms, bedspaces and apartments near school or work.",
    icon: UserRound,
  },
  {
    value: "landlord",
    title: "List a property",
    description: "Rent out your rooms, units or boarding house.",
    icon: Building2,
  },
] as const

interface Values extends Record<string, unknown> {
  name: string
  email: string
  phone: string
  password: string
  municipalityId: string
  occupation: RenterOccupation
  businessName: string
  agree: boolean
}

const validate = (v: Values) => {
  const errors: Partial<Record<keyof Values, string>> = {}

  if (v.name.trim().split(/\s+/).filter(Boolean).length < 2) {
    errors.name = "Enter your first and last name."
  }

  if (!isEmail(v.email)) {
    errors.email = "Enter a valid email address."
  }

  if (!isPhMobile(v.phone)) {
    errors.phone = "Enter a PH mobile number."
  }

  if (v.password.length < 8) {
    errors.password = "Use at least 8 characters."
  }

  if (!v.municipalityId) {
    errors.municipalityId = "Choose a town."
  }

  if (!v.agree) {
    errors.agree = "You need to accept the terms to continue."
  }

  return errors
}

function RegisterPage() {
  useDocumentTitle("Create account")

  const [params] = useSearchParams()
  const navigate = useNavigate()

  const { register } = useAuth()
  const { data: towns = [] } = useMunicipalities()

  const [role, setRole] = useState<Role>(
    params.get("role") === "landlord" ? "landlord" : "renter",
  )

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const form = useFormState<Values>(
    {
      name: "",
      email: "",
      phone: "",
      password: "",
      municipalityId: NONE,
      occupation: "student",
      businessName: "",
      agree: false,
    },
    validate,
  )

  const { values, set, blur, errorFor } = form

  const isLandlord = role === "landlord"
  const next = safeNext(params.get("next"))

  const inputClassName = "rounded-xl"
  const selectClassName = "w-full rounded-xl"

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!form.attempt()) {
      // The invalid state renders after this handler, so look for it on the next frame.
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      })
      return
    }

    setPending(true)
    setError(null)

    try {
      const session = await register({
        role,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        municipalityId: values.municipalityId,
        occupation: isLandlord ? undefined : values.occupation,
        businessName: isLandlord
          ? values.businessName.trim() || undefined
          : undefined,
      })

      const destination =
        next ?? (isLandlord ? PATHS.landlord.verification : homeForRole(session.user.role))

      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <header>
        <h1 className="type-page-title text-foreground">
          Create your account
        </h1>

        <p className="mt-1 hidden text-body text-muted-foreground tall:block">
          Free for renters and landlords.
        </p>
      </header>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-foreground">
          I want to
        </legend>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon
            const selected = role === option.value

            return (
              <label
                key={option.value}
                className={cn(
                  "group relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 pr-8 transition-colors focus-within:ring-2 focus-within:ring-ring/40",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    setRole(option.value)
                    setError(null)
                  }}
                  className="sr-only"
                />

                <div
                  className={cn(
                    "hidden size-9 shrink-0 items-center justify-center rounded-xl transition-colors sm:flex",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </div>

                <span
                  className={cn(
                    "absolute top-2.5 right-2.5 flex size-4.5 items-center justify-center rounded-full border transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                  )}
                  aria-hidden="true"
                >
                  {selected && (
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {option.title}
                  </span>

                  <span className="mt-0.5 hidden text-caption text-muted-foreground tall:block">
                    {option.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-4 sm:gap-y-3">
          <FormField
            label="Full name"
            required
            error={errorFor("name")}
            className="col-span-2 min-w-0 sm:col-span-1"
          >
            <Input
              autoComplete="name"
              placeholder="First and last name"
              className={inputClassName}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => blur("name")}
            />
          </FormField>

          <FormField
            label="Email address"
            required
            error={errorFor("email")}
            className="col-span-2 min-w-0 sm:col-span-1"
          >
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClassName}
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => blur("email")}
            />
          </FormField>

          <FormField
            label="Mobile number"
            required
            error={errorFor("phone")}
            className="min-w-0"
          >
            <Input
              type="tel"
              autoComplete="tel"
              placeholder="0917 123 4567"
              className={inputClassName}
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => blur("phone")}
            />
          </FormField>

          <FormField
            label="Password"
            required
            error={errorFor("password")}
            className="min-w-0"
          >
            <PasswordInput
              autoComplete="new-password"
              placeholder="8+ characters"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              onBlur={() => blur("password")}
            />
          </FormField>

          <FormField
            label={isLandlord ? "Properties in" : "Moving to"}
            required
            error={errorFor("municipalityId")}
            className="min-w-0"
          >
            <Select
              value={values.municipalityId}
              onValueChange={(value) => set("municipalityId", value)}
              onOpenChange={(open) => !open && blur("municipalityId")}
            >
              <SelectTrigger className={selectClassName}>
                <SelectValue placeholder="Choose a town" />
              </SelectTrigger>

              <SelectContent>
                {towns.map((town) => (
                  <SelectItem key={town.id} value={town.id}>
                    {town.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {isLandlord ? (
            <FormField label="Business name" optional className="min-w-0">
              <Input
                placeholder="e.g. Santos Residences"
                className={inputClassName}
                value={values.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </FormField>
          ) : (
            <FormField label="I'm a" className="min-w-0">
              <Select
                value={values.occupation}
                onValueChange={(value) =>
                  set("occupation", value as RenterOccupation)
                }
              >
                <SelectTrigger className={selectClassName}>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {(Object.keys(OCCUPATIONS) as RenterOccupation[]).map((occupation) => (
                    <SelectItem key={occupation} value={occupation}>
                      {OCCUPATIONS[occupation]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={values.agree}
              onCheckedChange={(checked) => set("agree", checked === true)}
              aria-invalid={Boolean(errorFor("agree"))}
              aria-describedby={errorFor("agree") ? "agree-error" : undefined}
              className="mt-0.5"
            />

            {/* block: the base Label is flex, which would split this sentence into columns. */}
            <Label
              htmlFor="agree"
              className="block cursor-pointer text-meta font-normal text-muted-foreground"
            >
              I agree to the{" "}
              <span className="font-medium text-foreground">Terms of Use</span>{" "}
              and{" "}
              <span className="font-medium text-foreground">Privacy Policy</span>
              , and I'll only post accurate information.
            </Label>
          </div>

          {errorFor("agree") && (
            <p id="agree-error" className="pl-7 text-meta text-destructive">
              {errorFor("agree")}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full rounded-xl"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating your account...
            </>
          ) : isLandlord ? (
            "Create landlord account"
          ) : (
            "Create my account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to={`${PATHS.login}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-primary underline-offset-4 transition-colors underline decoration-transparent hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export { RegisterPage as Component }
