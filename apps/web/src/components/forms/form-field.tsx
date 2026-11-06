import { useId, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { FormFieldContext } from "./form-field-context"
import { cn } from "@/lib/utils"

/**
 * Label + control + helper/error text. Controls (Input, Textarea,
 * SelectTrigger) read the id and ARIA wiring from context, so they can sit
 * inside wrappers (e.g. a ₱ prefix) and still be labelled correctly.
 */
export function FormField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | false
  required?: boolean
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id} className="gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      <FormFieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>{children}</FormFieldContext.Provider>
      {(error || hint) && (
        <p id={describedBy} className={cn("text-meta", error ? "text-destructive" : "text-muted-foreground")}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
