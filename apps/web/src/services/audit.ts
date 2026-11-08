import type { AuditEntry, User } from "@/types"
import { db, nextId } from "./mock/db"
import { ServiceError } from "./mock/latency"

/**
 * Records an admin decision. Only services call this, in the same step as the change it
 * describes, so the log can't drift from what actually happened. Entries are append-only:
 * nothing edits or removes them.
 */
export function recordDecision(actor: User, entry: Omit<AuditEntry, "id" | "at" | "actorId" | "actorName">) {
  db.auditLog.unshift({
    id: nextId("au"),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    ...entry,
  })
}

/** Refuses a decision whose note is missing or too short to be useful later. */
export function requireNote(note: string | undefined, min: number, message: string): string {
  const trimmed = note?.trim() ?? ""
  if (trimmed.length < min) throw new ServiceError("invalid", message)
  return trimmed
}
