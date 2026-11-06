import { scheduleSave } from "./db"

export class ServiceError extends Error {
  readonly code: "not-found" | "forbidden" | "invalid" | "unknown"

  constructor(code: ServiceError["code"], message: string) {
    super(message)
    this.name = "ServiceError"
    this.code = code
  }
}

const BASE_DELAY_MS = 260

/**
 * Resolves the result of `fn` after a short, slightly random delay so loading
 * states are exercised. Results are cloned so callers can't mutate the store.
 */
export function respond<T>(fn: () => T, delay = BASE_DELAY_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = fn()
        scheduleSave()
        resolve(structuredClone(result))
      } catch (error) {
        reject(error)
      }
    }, delay + Math.random() * 180)
  })
}

export function notFound(what: string): never {
  throw new ServiceError("not-found", `${what} could not be found.`)
}
