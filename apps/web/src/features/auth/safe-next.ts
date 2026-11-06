/**
 * The page to return to after signing in. Only same-site paths are allowed: browsers treat
 * "//host" and "/\host" as another site, so a crafted ?next= link could otherwise send people away.
 */
export const safeNext = (next: string | null) => (next && /^\/(?![/\\])/.test(next) ? next : null)
