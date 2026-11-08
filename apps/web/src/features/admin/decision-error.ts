import { ServiceError } from "@/services"

/**
 * What to tell an admin when a decision didn't go through. The services explain their own
 * refusals (a missing note, a record someone else already decided), so those are shown as
 * written; anything unexpected gets the generic retry message.
 */
export function decisionError(error: unknown) {
  if (error instanceof ServiceError && (error.code === "invalid" || error.code === "forbidden")) {
    return error.message
  }
  return "That didn't save. Try again."
}
