import { ArrowUpRight, LockKeyhole } from "lucide-react"
import { Link } from "react-router"
import { UserAvatar } from "@/components/common/user-avatar"
import { SignOutButton } from "@/components/layout/sign-out-button"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS } from "@/constants/status"
import { useAuth } from "@/features/auth/auth-context"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A quiet, numbered section heading shared with the redesigned Admin pages. */
function SectionHeading({
  id,
  title,
  description,
  descriptionClassName,
}: {
  id: string
  title: string
  description: string
  descriptionClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="min-w-0">
        <h2
          id={id}
          className="font-display text-xl font-semibold tracking-[-0.035em] text-foreground sm:text-2xl"
        >
          {title}
        </h2>
        <p className={cn("mt-1 max-w-[62ch] text-sm leading-snug text-muted-foreground sm:leading-relaxed", descriptionClassName)}>
          {description}
        </p>
      </div>
    </div>
  )
}

/** Accessible, compact details list; no editable fields or invented account data. */
function AccountFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-border/70 py-[calc(var(--pad)*0.42)] first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

/**
 * Read-only Administrator profile, styled to match Abong's editorial Admin UI.
 * Uses only existing session data, routing and the original sign-out action.
 */
function AdminProfilePage() {
  useDocumentTitle("Profile")
  const { user } = useAuth()

  // Account routes normally require authentication. Guard against a brief
  // missing-session render rather than dereferencing user! during transition.
  if (!user) return null

  return (
    // Spacing follows the viewport height so the whole page fits one screen: --gap
    // separates the sections and --pad sets the space inside them, both reaching
    // their full size near 900px tall. -mb-10 cancels the layout's bottom padding.
    <div className="mx-auto -mt-2 -mb-10 w-full max-w-[1120px] space-y-(--gap) pb-3 sm:mt-0 sm:pb-4 [--gap:clamp(0.75rem,6svh_-_1.75rem,1.5rem)] [--pad:clamp(0.5rem,5svh_-_1.75rem,1.25rem)] sm:[--gap:clamp(0.75rem,14svh_-_4.75rem,3rem)] sm:[--pad:clamp(0.625rem,10svh_-_3.25rem,2.25rem)]">
      <header className="border-b border-border/80 pb-(--pad)">
        <h1 className="type-page-title">Your profile</h1>
        <p className="mt-[calc(var(--pad)*0.3)] max-w-[52ch] text-sm leading-snug sm:leading-relaxed text-muted-foreground sm:text-base">
          The details associated with your administrator account.
        </p>
      </header>

      <section aria-labelledby="account-identity-heading" className="space-y-[calc(var(--gap)*0.5)]">
        <SectionHeading
          id="account-identity-heading"
          title="Account identity"
          description="Your account details, presented in one place."
          // The one sentence short phones can spare: it repeats the heading.
          descriptionClassName="max-sm:[@media(height<45rem)]:hidden"
        />

        <div className="grid min-w-0 border-y border-border/80 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-4 py-(--pad) sm:gap-5 lg:pr-10">
            <UserAvatar
              name={user.name}
              className="size-[clamp(3rem,8svh,4rem)] shrink-0 text-lg sm:size-[clamp(3.5rem,9svh,5rem)] sm:text-xl"
            />
            <div className="min-w-0 space-y-2">
              <p className="break-words type-subsection text-foreground">
                {user.name}
              </p>
              <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-caption font-medium tracking-[0.01em] text-foreground">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          <dl className="min-w-0 border-t border-border/80 py-(--pad) lg:border-l lg:border-t-0 lg:pl-10">
            <AccountFact label="Email" value={user.email} />
            <AccountFact label="Account type" value={ROLE_LABELS[user.role]} />
            <AccountFact label="Joined" value={formatDate(user.joinedAt)} />
          </dl>
        </div>
      </section>

      <section aria-labelledby="account-access-heading" className="space-y-[calc(var(--gap)*0.5)]">
        <SectionHeading
          id="account-access-heading"
          title="Account access"
          description="Profile information is read-only in this version of Abong."
        />

        <div className="flex flex-col gap-3 border-y border-border/80 py-(--pad) sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <LockKeyhole className="size-[18px]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Current session</h3>
              <p className="mt-1 max-w-[50ch] text-sm leading-snug text-muted-foreground sm:leading-relaxed">
                Sign out when you’re finished using this account.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
            <SignOutButton />
            {/* This destination already lives in the desktop admin navigation rail. */}
            <Button
              variant="outline"
              asChild
              className="gap-2 rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:hidden"
            >
              <Link to="/">
                <ArrowUpRight className="size-4" aria-hidden="true" />
                View public site
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export { AdminProfilePage as Component }
