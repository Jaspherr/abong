import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, MoreHorizontal, ShieldCheck, Users } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Pagination } from "@/components/common/pagination"
import { MetaBadge, StatusBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmptyState, ErrorState } from "@/components/feedback/states"
import { TableSkeleton } from "@/components/feedback/skeletons"
import { SearchInput } from "@/components/forms/search-input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ACCOUNT_STATUS, ROLE_LABELS, VERIFICATION_STATUS, type Tone } from "@/constants/status"
import { AdminPageHeader, HeaderMetric } from "@/features/admin/admin-page-header"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate, formatNumber, formatRelative } from "@/lib/format"
import { qk } from "@/lib/query"
import { adminService, type UserQuery } from "@/services"
import type { AccountStatus, User, UserRole } from "@/types"

const ROLE_TONE: Record<UserRole, Tone> = {
  renter: "neutral",
  landlord: "brand",
  admin: "info",
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <StatusBadge tone={ROLE_TONE[role]} dot={false}>
      {ROLE_LABELS[role]}
    </StatusBadge>
  )
}

interface AccountActionsProps {
  user: User
  busy: boolean
  onCopyEmail: (email: string) => void
  onSuspend: (user: User) => void
  onReactivate: (user: User) => void
}

/** Shared actions across compact mobile cards and the desktop directory. */
function AccountActions({ user, busy, onCopyEmail, onSuspend, onReactivate }: AccountActionsProps) {
  if (user.role === "admin") {
    return (
      <span
        role="img"
        className="inline-flex size-9 shrink-0 items-center justify-center text-muted-foreground"
        title="Admin accounts can't be changed here"
        aria-label={`${user.name} is an admin, so this account can't be changed here`}
      >
        <ShieldCheck className="size-4" aria-hidden="true" />
      </span>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          aria-label={`Actions for ${user.name}`}
          disabled={busy}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onCopyEmail(user.email)}>Copy email</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === "suspended" || user.status === "deactivated" ? (
          <DropdownMenuItem onSelect={() => onReactivate(user)}>Reactivate account</DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onSelect={() => onSuspend(user)}>
            Suspend account
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UsersPage() {
  useDocumentTitle("Users")

  const client = useQueryClient()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<UserQuery["role"]>("all")
  const [status, setStatus] = useState<UserQuery["status"]>("all")
  const [page, setPage] = useState(1)
  const [suspending, setSuspending] = useState<User | null>(null)

  const debounced = useDebouncedValue(search, 250)
  const query: UserQuery = { search: debounced, role, status, page, pageSize: 8 }
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: qk.admin.users(query),
    queryFn: () => adminService.listUsers(query),
    placeholderData: keepPreviousData,
  })

  const setAccount = useMutation({
    mutationFn: ({ user, next }: { user: User; next: AccountStatus }) =>
      adminService.setUserStatus(user.id, next),
    onSuccess: (updatedUser) => {
      void client.invalidateQueries({ queryKey: ["admin"] })
      // A landlord's status decides whether their listings are public.
      void client.invalidateQueries({ queryKey: ["listings"] })
      void client.invalidateQueries({ queryKey: ["places"] })
      setSuspending(null)
      toast.success(`${updatedUser.name} is now ${ACCOUNT_STATUS[updatedUser.status].label.toLowerCase()}`)
    },
    onError: () => toast.error("That didn't save. Try again."),
  })

  const resetPage = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value)
    setPage(1)
  }

  const filtered = search !== "" || role !== "all" || status !== "all"

  const clearFilters = () => {
    setSearch("")
    setRole("all")
    setStatus("all")
    setPage(1)
  }

  const copyEmail = async (email: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(email)
      toast("Email copied")
    } catch {
      toast.error("Couldn't copy the email. Please try again.")
    }
  }

  const actions = (user: User) => (
    <AccountActions
      user={user}
      busy={setAccount.isPending}
      onCopyEmail={(email) => void copyEmail(email)}
      onSuspend={setSuspending}
      onReactivate={(account) => setAccount.mutate({ user: account, next: "active" })}
    />
  )

  const totalLabel = filtered ? "Matching accounts" : "Abong accounts"

  return (
    <div className="w-full space-y-5 pb-10">
      <AdminPageHeader
        title="Users"
        description="Find accounts, review access and manage account status."
        metric={
          <HeaderMetric
            loading={isPending}
            value={isError ? "—" : formatNumber(data?.total ?? 0)}
            label={totalLabel}
            detail={isError ? "Count unavailable" : isFetching ? "Updating results" : filtered ? "Based on active filters" : "Across the platform"}
          />
        }
      />

      <section aria-labelledby="users-directory-title" className="min-w-0 space-y-5">
        <h2 id="users-directory-title" className="sr-only">
          Account directory
        </h2>
        <div className="grid gap-3 border-y border-border/80 py-4 sm:py-5 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center lg:gap-5">
          <SearchInput
            label="Search users"
            placeholder="Search name or email"
            value={search}
            onChange={resetPage(setSearch)}
            className="w-full lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none sm:gap-3">
              <Select value={role} onValueChange={resetPage((value: string) => setRole(value as UserQuery["role"]))}>
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ROLE_LABELS[value]}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={resetPage((value: string) => setStatus(value as UserQuery["status"]))}>
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  {(Object.keys(ACCOUNT_STATUS) as AccountStatus[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ACCOUNT_STATUS[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
        <div className="min-w-0" aria-busy={isFetching}>
          {isPending ? (
            <TableSkeleton />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : data.rows.length === 0 ? (
            <div className="border-b border-border/80 py-8">
              <EmptyState
                compact
                icon={Users}
                title={filtered ? "No users match" : "No users yet"}
                description={filtered ? "Try a different name, role or status." : "Accounts will appear here when they're available."}
              />
              {filtered && (
                <div className="mt-3 flex justify-center">
                  <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`transition-opacity duration-150 motion-reduce:transition-none ${isFetching ? "opacity-60" : "opacity-100"}`}>
                {/* Mobile: retain role, status, dates and verification without a cramped table. */}
                <ul aria-label="Users" className="divide-y divide-border/75 border-b border-border/80 md:hidden">
                  {data.rows.map((user) => (
                    <li key={user.id} className="py-5 first:pt-1">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserAvatar name={user.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-[-0.015em] text-foreground">{user.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <RoleBadge role={user.role} />
                            <MetaBadge meta={ACCOUNT_STATUS[user.status]} />
                          </div>
                        </div>
                        {actions(user)}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border/60 pt-3 text-xs">
                        <div>
                          <p className="text-caption font-medium text-muted-foreground">Last active</p>
                          <p className="mt-1 text-foreground">{formatRelative(user.lastActiveAt)}</p>
                        </div>
                        <div>
                          <p className="text-caption font-medium text-muted-foreground">Joined</p>
                          <p className="mt-1 tabular-nums text-foreground">{formatDate(user.joinedAt)}</p>
                        </div>
                        <div className="col-span-2 flex flex-wrap items-center gap-2">
                          <p className="text-caption font-medium text-muted-foreground">ID verification</p>
                          <MetaBadge meta={VERIFICATION_STATUS[user.verification]} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: operational data stays dense, legible and sortable only if supported by the service. */}
                <div className="hidden min-w-0 md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/80 bg-muted/25 hover:bg-muted/25">
                        <TableHead className="h-11 pl-3 text-caption font-semibold text-muted-foreground sm:pl-4">Account</TableHead>
                        <TableHead className="h-11 text-caption font-semibold text-muted-foreground">Role</TableHead>
                        <TableHead className="h-11 text-caption font-semibold text-muted-foreground">Status</TableHead>
                        <TableHead className="hidden h-11 text-caption font-semibold text-muted-foreground xl:table-cell">Joined</TableHead>
                        <TableHead className="h-11 text-caption font-semibold text-muted-foreground">Last active</TableHead>
                        <TableHead className="hidden h-11 text-caption font-semibold text-muted-foreground lg:table-cell">ID verification</TableHead>
                        <TableHead className="h-11 w-12 pr-3 sm:pr-4"><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-border/70 transition-colors duration-150 hover:bg-muted/35 motion-reduce:transition-none"
                        >
                          <TableCell className="max-w-0 min-w-52 py-4 pl-3 whitespace-normal sm:pl-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar name={user.name} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{user.name}</p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><RoleBadge role={user.role} /></TableCell>
                          <TableCell><MetaBadge meta={ACCOUNT_STATUS[user.status]} /></TableCell>
                          <TableCell className="hidden text-xs tabular-nums text-muted-foreground xl:table-cell">{formatDate(user.joinedAt)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatRelative(user.lastActiveAt)}</TableCell>
                          <TableCell className="hidden lg:table-cell"><MetaBadge meta={VERIFICATION_STATUS[user.verification]} /></TableCell>
                          <TableCell className="w-12 pr-3 text-right sm:pr-4">
                            {actions(user)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="border-t border-border/70 pt-2">
                <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
              </div>
            </>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Administrative accounts are protected from status changes in this directory.
        </p>
      </section>

      <AlertDialog open={Boolean(suspending)} onOpenChange={(open) => !open && !setAccount.isPending && setSuspending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {suspending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {suspending?.role === "landlord"
                ? "They can't sign in, and their listings are hidden from renters. Reactivating the account from this page brings the listings back."
                : "They can't sign in until you reactivate the account from this page."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setAccount.isPending}>Keep account active</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={setAccount.isPending}
              onClick={(event) => {
                // Radix AlertDialogAction normally closes immediately. Keep it
                // open until the mutation succeeds, so failures can be retried.
                event.preventDefault()
                if (suspending) setAccount.mutate({ user: suspending, next: "suspended" })
              }}
            >
              {setAccount.isPending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Suspend account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { UsersPage as Component }
