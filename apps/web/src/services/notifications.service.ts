import type { Notification } from "@/types"
import { db } from "./mock/db"
import { respond } from "./mock/latency"

export const notificationsService = {
  list(userId: string): Promise<Notification[]> {
    return respond(
      () => db.notifications.filter((n) => n.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      150,
    )
  },

  markAllRead(userId: string): Promise<void> {
    return respond(() => {
      db.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true))
    }, 80)
  },
}
