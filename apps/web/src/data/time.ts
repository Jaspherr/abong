/** Mock timestamps are relative to "now" so the demo never looks stale. */
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()
export const daysAgo = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR).toISOString()
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)
