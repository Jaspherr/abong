import { createContext, useContext } from "react"

export interface FormFieldControl {
  id: string
  describedBy?: string
  invalid: boolean
  required?: boolean
}

/**
 * Lets composite controls (e.g. Radix Select, whose focusable element is the
 * trigger, not the root) pick up the label/description wiring from FormField.
 */
export const FormFieldContext = createContext<FormFieldControl | null>(null)

export const useFormFieldControl = () => useContext(FormFieldContext)
