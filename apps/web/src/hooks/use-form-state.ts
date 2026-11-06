import { useCallback, useMemo, useState } from "react"

type Errors<T> = Partial<Record<keyof T, string>>

/**
 * Minimal controlled-form helper: values, per-field validation, and
 * "show errors after first submit or blur". Enough for the mock forms without
 * pulling in a form library.
 */
export function useFormState<T extends Record<string, unknown>>(initial: T, validate: (values: T) => Errors<T>) {
  const [values, setValues] = useState<T>(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const errors = useMemo(() => validate(values), [values, validate])

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value })), [])
  const blur = useCallback((key: keyof T) => setTouched((t) => ({ ...t, [key]: true })), [])
  const errorFor = (key: keyof T) => ((submitted || touched[key]) && errors[key]) || undefined

  return {
    values,
    setValues,
    set,
    blur,
    errorFor,
    isValid: Object.keys(errors).length === 0,
    /** Marks the form as submitted; returns true when it can proceed. */
    attempt: () => {
      setSubmitted(true)
      return Object.keys(errors).length === 0
    },
    reset: (next: T = initial) => {
      setValues(next)
      setTouched({})
      setSubmitted(false)
    },
  }
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
/** Accepts 09XXXXXXXXX or +639XXXXXXXXX with optional spaces/dashes. */
export const isPhMobile = (value: string) => /^(\+?63|0)9\d{9}$/.test(value.replace(/[\s-]/g, ""))
