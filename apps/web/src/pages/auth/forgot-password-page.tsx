import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PATHS } from "@/constants/app"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { isEmail, useFormState } from "@/hooks/use-form-state"
import { authService } from "@/services"

const validate = (v: { email: string }) => (isEmail(v.email) ? {} : { email: "Enter a valid email address." })

function ForgotPasswordPage() {
  useDocumentTitle("Reset password")
  const form = useFormState({ email: "" }, validate)
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="type-page-title">Check your email</h1>
          <p className="text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{form.values.email}</span>, we've sent a
            link to reset your password. It expires in 30 minutes.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to={PATHS.login}>Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to={PATHS.login} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sign in
      </Link>
      <div className="space-y-1.5 text-center">
        <h1 className="type-page-title">Reset your password</h1>
        <p className="text-balance text-muted-foreground">Enter the email you use for Abong and we'll send you a reset link.</p>
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!form.attempt()) return
          setState("sending")
          await authService.requestPasswordReset(form.values.email)
          setState("sent")
        }}
      >
        <FormField label="Email" error={form.errorFor("email")}>
          <Input type="email" autoComplete="email" value={form.values.email} onChange={(e) => form.set("email", e.target.value)} onBlur={() => form.blur("email")} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
          {state === "sending" && <Loader2 className="animate-spin" aria-hidden="true" />}
          Send reset link
        </Button>
      </form>
    </div>
  )
}

export { ForgotPasswordPage as Component }
