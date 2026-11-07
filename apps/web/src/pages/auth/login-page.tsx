import { Building2, Loader2, Shield, UserRound } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { FormField } from "@/components/forms/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEMO_MODE, PATHS } from "@/constants/app"
import { homeForRole, useAuth } from "@/features/auth/auth-context"
import { PasswordInput } from "@/features/auth/password-input"
import { safeNext } from "@/features/auth/safe-next"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isEmail, useFormState } from "@/hooks/use-form-state"
import type { UserRole } from "@/types"

const DEMO_ROLES: Array<{ role: UserRole; label: string; detail: string; icon: typeof UserRound }> = [
  { role: "renter", label: "Renter", detail: "Mika, nursing student", icon: UserRound },
  { role: "landlord", label: "Landlord", detail: "Teresita, Santos Residences", icon: Building2 },
  { role: "admin", label: "Admin", detail: "Carla, platform operations", icon: Shield },
]

const validate = (v: { email: string; password: string }) => ({
  ...(isEmail(v.email) ? {} : { email: "Enter the email you signed up with." }),
  ...(v.password.length >= 6 ? {} : { password: "Password must be at least 6 characters." }),
})

function LoginPage() {
  useDocumentTitle("Sign in")
  const { signIn, signInAs } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get("next"))
  const suggestedRole = params.get("as") as UserRole | null
  const form = useFormState({ email: "", password: "" }, validate)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const finish = (role: UserRole) => navigate(next ?? homeForRole(role), { replace: true })

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="type-page-title text-foreground">Welcome back</h1>
        <p className="mt-1 hidden text-body text-muted-foreground tall:block">Sign in to message landlords, track viewings and manage your listings.</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        ref={formRef}
        noValidate
        className="space-y-3 sm:space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!form.attempt()) {
            // The invalid state renders after this handler, so look for it on the next frame.
            requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
            return
          }
          setPending("form")
          setError(null)
          try {
            const session = await signIn(form.values.email)
            finish(session.user.role)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setPending(null)
          }
        }}
      >
        <FormField label="Email" error={form.errorFor("email")}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-xl"
            value={form.values.email}
            onChange={(e) => form.set("email", e.target.value)}
            onBlur={() => form.blur("email")}
          />
        </FormField>

        <div className="relative">
          <FormField label="Password" error={form.errorFor("password")}>
            <PasswordInput
              autoComplete="current-password"
              value={form.values.password}
              onChange={(e) => form.set("password", e.target.value)}
              onBlur={() => form.blur("password")}
            />
          </FormField>
          {/* Sits on the label's row to save height, but after the input in tab order. */}
          <Link to={PATHS.forgotPassword} className="absolute top-0 right-0 text-sm leading-none font-medium text-primary underline-offset-4 underline decoration-transparent transition-colors hover:decoration-current">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={pending !== null}>
          {pending === "form" && <Loader2 className="animate-spin" aria-hidden="true" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Abong?{" "}
        <Link to={`${PATHS.register}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary underline-offset-4 underline decoration-transparent transition-colors hover:decoration-current">
          Create an account
        </Link>
      </p>

      {DEMO_MODE && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-meta text-muted-foreground">
            <span className="font-semibold text-foreground">Demo accounts.</span> This build has no real sign-in. Pick a role to explore.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ROLES.map(({ role, label, detail, icon: Icon }) => (
              <Button
                key={role}
                variant={suggestedRole === role ? "secondary" : "outline"}
                className="h-auto min-h-10 justify-start gap-3 rounded-xl py-1.5 text-left"
                disabled={pending !== null}
                onClick={async () => {
                  setPending(role)
                  setError(null)
                  try {
                    const session = await signInAs(role)
                    finish(session.user.role)
                  } catch (err) {
                    setError((err as Error).message)
                  } finally {
                    setPending(null)
                  }
                }}
              >
                {pending === role ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">Continue as {label.toLowerCase()}</span>
                  <span className="hidden truncate text-caption font-normal text-muted-foreground tall:block">{detail}</span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { LoginPage as Component }
