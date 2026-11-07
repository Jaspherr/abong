
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { isSameDay } from "date-fns"
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  Inbox as InboxIcon,
  Loader2,
  MessageSquare,
  Search,
  SendHorizontal,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { Photo } from "@/components/common/photo"
import { StatusBadge } from "@/components/common/status-badge"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmptyState } from "@/components/feedback/states"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { DEMO_MODE, PATHS } from "@/constants/app"
import { priceUnit } from "@/features/listings/listing-utils"
import { formatDate, formatPeso, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { inquiriesService, type InquiryThread } from "@/services"

type Perspective = "renter" | "landlord"

const LANDLORD_QUICK_REPLIES = [
  "Yes, it's still available. When would you like to visit?",
  "Sorry, that room has just been taken. We have another one open.",
  "Water and Wi-Fi are included. Electricity is sub-metered.",
]

const SIMULATED_REPLIES = [
  "Thanks for your message! Yes, we can arrange a visit. Weekday afternoons work best.",
  "Good question. I'll check with our caretaker and get back to you today.",
  "You're welcome to drop by. Just request a viewing so I know when to expect you.",
]

const counterpart = (thread: InquiryThread, perspective: Perspective) =>
  perspective === "renter" ? thread.landlord.name : thread.renter.name

const unread = (thread: InquiryThread, perspective: Perspective) =>
  perspective === "renter"
    ? thread.unreadForRenter
    : thread.unreadForLandlord

// ============================================================
// CONVERSATION SIDEBAR
// ============================================================

interface ThreadListProps {
  threads: InquiryThread[]
  selectedId?: string
  perspective: Perspective
  onSelect: (id: string) => void
}

function ThreadList({
  threads,
  selectedId,
  perspective,
  onSelect,
}: ThreadListProps) {
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [resolvedOnly, setResolvedOnly] = useState(false)
  const resolvedCount = threads.filter((thread) => thread.status === "closed").length

  const unreadCount = threads.filter(
    (thread) => unread(thread, perspective) > 0,
  ).length

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return threads.filter((thread) => {
      if (unreadOnly && unread(thread, perspective) === 0) {
        return false
      }

      if (resolvedOnly && thread.status !== "closed") return false

      if (!query) return true

      const content = [
        counterpart(thread, perspective),
        thread.listing.name,
        thread.unitName ?? "",
        thread.messages.at(-1)?.body ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return content.includes(query)
    })
  }, [threads, perspective, search, unreadOnly, resolvedOnly])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* SIDEBAR HEADER */}
      <div className="shrink-0 border-b border-border/70 px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-caption font-semibold text-muted-foreground">
              Your inbox
            </p>

            <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight text-foreground">
              Messages
            </h2>
          </div>

          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
            {threads.length}
          </span>
        </div>

        {/* Search conversations */}
        <div className="relative mt-5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className={cn(
              "h-11 w-full rounded-xl border border-border/70 bg-muted/40",
              "pl-10 pr-9 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "outline-none transition-colors",
              "focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-ring/15",
            )}
          />

          {search && (
            <button
              type="button"
              aria-label="Clear conversation search"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Inbox filters */}
        <div
          className="mt-4 flex items-center gap-1"
          role="group"
          aria-label="Filter conversations"
        >
          <button
            type="button"
            aria-pressed={!unreadOnly && !resolvedOnly}
            onClick={() => {
              setUnreadOnly(false)
              setResolvedOnly(false)
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              !unreadOnly && !resolvedOnly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All
          </button>

          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => {
              setUnreadOnly(true)
              setResolvedOnly(false)
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5",
              "text-xs font-semibold transition-colors",
              unreadOnly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Unread

            {unreadCount > 0 && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-caption tabular-nums",
                  unreadOnly
                    ? "bg-background/15"
                    : "bg-primary/10 text-primary",
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Only landlords can resolve a conversation, so only they sort by it. */}
          {perspective === "landlord" && (
            <button
              type="button"
              aria-pressed={resolvedOnly}
              onClick={() => {
                setResolvedOnly(true)
                setUnreadOnly(false)
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                resolvedOnly
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Resolved {resolvedCount}
            </button>
          )}
        </div>
      </div>

      {/* CONVERSATION LIST */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="size-5" strokeWidth={1.7} />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              {unreadOnly && !search
                ? "You're all caught up"
                : "No conversations found"}
            </p>

            <p className="mt-2 max-w-52 text-xs leading-5 text-muted-foreground">
              {unreadOnly && !search
                ? "You don't have any unread messages."
                : "Try a different name, property, or keyword."}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("")
                setUnreadOnly(false)
              }}
              className="mt-5 text-xs font-semibold text-primary underline underline-offset-4 decoration-transparent transition-colors hover:decoration-current"
            >
              Show all conversations
            </button>
          </div>
        ) : (
          <ul className="py-2" aria-label="Conversations">
            {filtered.map((thread) => {
              const count = unread(thread, perspective)
              const selected = thread.id === selectedId
              const last = thread.messages.at(-1)

              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "group relative flex w-full min-w-0 gap-3",
                      "border-l-[3px] px-4 py-4 text-left",
                      "transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected
                        ? "border-primary bg-primary/[0.055]"
                        : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <div className="shrink-0 pt-0.5">
                      <UserAvatar
                        name={counterpart(thread, perspective)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name and time */}
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm text-foreground",
                            count > 0
                              ? "font-bold"
                              : "font-semibold",
                          )}
                        >
                          {counterpart(thread, perspective)}
                        </span>

                        <span
                          className={cn(
                            "shrink-0 text-caption tabular-nums",
                            count > 0
                              ? "font-semibold text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelative(thread.updatedAt)}
                        </span>
                      </div>

                      {/* Property context */}
                      <p className="mt-1 truncate text-caption font-medium text-muted-foreground">
                        {thread.listing.name}
                        {thread.unitName
                          ? `, ${thread.unitName}`
                          : ""}
                      </p>

                      {/* Message preview */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs leading-5",
                            count > 0
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {last?.body ?? "No messages yet"}
                        </p>

                        {count > 0 && (
                          <span className="flex size-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-caption font-bold text-primary-foreground tabular-nums">
                            {count}
                            <span className="sr-only">
                              {" "}unread messages
                            </span>
                          </span>
                        )}
                      </div>

                      {thread.status === "closed" && (
                        <span className="mt-2 inline-block text-caption font-medium text-muted-foreground">
                          Resolved
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* SIDEBAR FOOTER */}
      <div className="shrink-0 border-t border-border/70 px-5 py-3">
        <p className="text-caption text-muted-foreground">
          {threads.length}{" "}
          {threads.length === 1
            ? "conversation"
            : "conversations"}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// CONVERSATION VIEW
// ============================================================

interface ConversationProps {
  thread: InquiryThread
  perspective: Perspective
  currentUserId: string
  onBack: () => void
}

function Conversation({
  thread,
  perspective,
  currentUserId,
  onBack,
}: ConversationProps) {
  const client = useQueryClient()

  const [draft, setDraft] = useState("")
  const [typing, setTyping] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)

  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["inquiries"],
    })
  }

  // ----------------------------------------------------------
  // MARK CONVERSATION AS READ
  // ----------------------------------------------------------

  const markRead = useMutation({
    mutationFn: () =>
      inquiriesService.markRead(thread.id, perspective),
    onSuccess: refresh,
  })

  const hasUnread = unread(thread, perspective) > 0

  useEffect(() => {
    if (hasUnread) {
      markRead.mutate()
    }
    // Preserve existing read behavior.
  }, [thread.id, hasUnread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------------------------------------
  // SCROLL TO NEW MESSAGES
  // ----------------------------------------------------------

  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: "instant",
    })
  }, [thread.messages.length, typing])

  // ----------------------------------------------------------
  // SEND MESSAGE
  // ----------------------------------------------------------

  const send = useMutation({
    mutationFn: (body: string) =>
      inquiriesService.sendMessage(
        thread.id,
        currentUserId,
        body,
      ),

    onSuccess: () => {
      setDraft("")
      refresh()

      if (DEMO_MODE && perspective === "renter") {
        setTyping(true)

        window.setTimeout(async () => {
          const reply =
            SIMULATED_REPLIES[
              thread.messages.length % SIMULATED_REPLIES.length
            ]

          try {
            await inquiriesService.sendMessage(
              thread.id,
              thread.landlord.userId,
              reply,
            )

            await inquiriesService.markRead(
              thread.id,
              "renter",
            )
          } catch {
            // Demo reply failure should not undo the sent message.
          } finally {
            setTyping(false)
            refresh()
          }
        }, 2200)
      }
    },

    onError: () => {
      toast.error("Message not sent. Try again.")
    },
  })

  // ----------------------------------------------------------
  // RESOLVE / REOPEN CONVERSATION
  // ----------------------------------------------------------

  const close = useMutation({
    mutationFn: () =>
      inquiriesService.setStatus(
        thread.id,
        thread.status === "open" ? "closed" : "open",
      ),

    onSuccess: () => {
      refresh()

      toast.success(
        thread.status === "open"
          ? "Marked as resolved"
          : "Conversation reopened",
      )
    },

    onError: () => {
      toast.error("Couldn't update the conversation.")
    },
  })

  const submit = () => {
    const body = draft.trim()

    if (body && !send.isPending) {
      send.mutate(body)
    }
  }

  const name = counterpart(thread, perspective)
  const isResolved = thread.status === "closed"

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-card">

      {/* =====================================================
          CONVERSATION HEADER
      ===================================================== */}
      <header className="shrink-0 border-b border-border/70 bg-card">

        {/* Contact bar */}
        <div className="flex min-h-18 items-center gap-3 px-3 py-3 sm:px-5">

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to conversations"
            className="shrink-0 rounded-full lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>

          <div className="shrink-0">
            <UserAvatar name={name} />
          </div>

          {/* Contact identity */}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {name}
            </h2>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {perspective === "renter"
                ? "Property owner"
                : "Rental inquiry"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isResolved && (
              <span className="hidden sm:inline-flex">
                <StatusBadge tone="neutral">
                  Resolved
                </StatusBadge>
              </span>
            )}

            {perspective === "landlord" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={close.isPending}
                onClick={() => close.mutate()}
                aria-label={
                  isResolved
                    ? "Reopen conversation"
                    : "Resolve conversation"
                }
                className="h-9 gap-2 rounded-lg border-border px-3 text-xs font-semibold"
              >
                {close.isPending ? (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCheck
                    className="size-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                )}

                <span className="hidden sm:inline">
                  {isResolved ? "Reopen" : "Resolve"}
                </span>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg border-border px-3 text-xs font-semibold"
              >
                <Link to={PATHS.listing(thread.listing.id)}>
                  <ExternalLink
                    className="size-3.5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <span className="hidden sm:inline">
                    View listing
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Property context strip */}
        <div className="flex min-w-0 items-center gap-3 border-t border-border/60 bg-muted/35 px-4 py-2.5 sm:px-5">
          <Photo
            src={thread.listing.photos[0]?.src}
            alt=""
            className="size-10 shrink-0 rounded-lg"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {thread.listing.name}
              {thread.unitName
                ? `, ${thread.unitName}`
                : ""}
            </p>

            <p className="mt-0.5 truncate text-caption text-muted-foreground">
              {formatPeso(thread.listing.priceFrom)}{" "}
              {priceUnit(thread.listing.pricingBasis)}
            </p>
          </div>

          <Link
            to={PATHS.listing(thread.listing.id)}
            aria-label={`View ${thread.listing.name}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ExternalLink
              className="size-4"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </Link>
        </div>
      </header>

      {/* =====================================================
          MESSAGE TIMELINE
      ===================================================== */}
      <div
        role="log"
        tabIndex={0}
        aria-label="Messages"
        aria-live="polite"
        aria-relevant="additions text"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          "bg-muted/[0.18] px-4 py-6 sm:px-7 sm:py-8",
        )}
      >
        <div className="mx-auto max-w-3xl">

          {thread.messages.map((message, index) => {
            const mine = message.senderId === currentUserId

            const previous = thread.messages[index - 1]
            const next = thread.messages[index + 1]

            const newDay =
              !previous ||
              !isSameDay(
                new Date(previous.sentAt),
                new Date(message.sentAt),
              )

            const continued =
              !newDay &&
              previous.senderId === message.senderId

            const lastInGroup =
              !next ||
              next.senderId !== message.senderId ||
              !isSameDay(
                new Date(next.sentAt),
                new Date(message.sentAt),
              )

            return (
              <div
                key={message.id}
                className={cn(
                  continued ? "mt-1" : "mt-5",
                  index === 0 && "mt-0",
                )}
              >

                {/* Date separator */}
                {newDay && (
                  <div className="mb-6 flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 bg-border/70"
                    />

                    <span className="shrink-0 text-caption font-semibold text-muted-foreground">
                      {formatDate(
                        message.sentAt,
                        "EEEE, MMM d",
                      )}
                    </span>

                    <span
                      aria-hidden="true"
                      className="h-px flex-1 bg-border/70"
                    />
                  </div>
                )}

                {/* Message */}
                <div
                  className={cn(
                    "flex",
                    mine
                      ? "justify-end"
                      : "justify-start",
                  )}
                >
                  <div className="max-w-[86%] min-w-0 sm:max-w-[72%]">

                    <div
                      className={cn(
                        "rounded-[1.15rem] px-4 py-2.5",
                        "text-meta leading-[1.65] sm:text-sm",
                        mine
                          ? [
                              "rounded-br-md",
                              "bg-primary text-primary-foreground",
                            ].join(" ")
                          : [
                              "rounded-bl-md",
                              "border border-border/70",
                              "bg-card text-foreground",
                            ].join(" "),
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    </div>

                    {/* Time shown at end of message group */}
                    {lastInGroup && (
                      <p
                        className={cn(
                          "mt-1.5 px-1 text-caption text-muted-foreground tabular-nums",
                          mine
                            ? "text-right"
                            : "text-left",
                        )}
                      >
                        {formatDate(
                          message.sentAt,
                          "h:mm a",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Demo typing indicator */}
          {typing && (
            <div className="mt-5 flex items-end gap-3">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/70 bg-card px-4 py-3">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{
                      animationDelay: `${index * 140}ms`,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <p className="pb-2 text-caption text-muted-foreground">
                {thread.landlord.name} is typing
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* =====================================================
          MESSAGE COMPOSER
      ===================================================== */}
      <form
        className="shrink-0 border-t border-border/70 bg-card px-3 py-3 sm:px-6 sm:py-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >

        {/* Landlord quick replies */}
        {perspective === "landlord" && (
          <div className="mb-3">
            <p className="mb-2 text-caption font-semibold text-muted-foreground">
              Quick replies
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {LANDLORD_QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setDraft(reply)}
                  className={cn(
                    "max-w-[15rem] shrink-0 truncate",
                    "rounded-full border border-border",
                    "bg-background px-3 py-1.5",
                    "text-caption font-medium text-muted-foreground",
                    "transition-colors hover:border-primary/40",
                    "hover:bg-primary/5 hover:text-foreground",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                  title={reply}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Floating-style composer */}
        <div className="mx-auto max-w-3xl">
          <div
            className={cn(
              "flex items-end gap-2 rounded-2xl",
              "border border-border bg-background p-2",
              "transition-[border-color,box-shadow] duration-200",
              "focus-within:border-primary/45",
              "focus-within:ring-2 focus-within:ring-primary/10",
            )}
          >
            <label htmlFor="composer" className="sr-only">
              Write a message
            </label>

            <Textarea
              id="composer"
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  submit()
                }
              }}
              rows={1}
              placeholder="Write a message..."
              disabled={send.isPending}
              aria-describedby="composer-hint"
              className={cn(
                "max-h-36 min-h-11 flex-1 resize-none",
                "border-0 bg-transparent px-3 py-3",
                "text-sm shadow-none",
                "focus-visible:ring-0 focus-visible:outline-none",
                "disabled:opacity-60",
              )}
            />

            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || send.isPending}
              aria-label="Send message"
              className={cn(
                "size-11 shrink-0 rounded-xl",
              )}
            >
              {send.isPending ? (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <SendHorizontal
                  className="size-4"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              )}
            </Button>
          </div>

          {/* Composer hint */}
          <div
            id="composer-hint"
            className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1"
          >
            <span className="text-caption text-muted-foreground">
              {send.isPending
                ? "Sending message..."
                : "Write directly to the other person"}
            </span>

            <span className="hidden text-caption text-muted-foreground sm:block">
              Enter to send, Shift+Enter for a new line
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}

// ============================================================
// MAIN INBOX
// ============================================================

interface InboxProps {
  threads: InquiryThread[] | undefined
  isPending: boolean
  perspective: Perspective
  currentUserId: string
  emptyAction?: React.ReactNode
}

export function Inbox({
  threads,
  isPending,
  perspective,
  currentUserId,
  emptyAction,
}: InboxProps) {
  const [params, setParams] = useSearchParams()

  const selectedId = params.get("thread") ?? undefined

  const selected = threads?.find(
    (thread) => thread.id === selectedId,
  )

  const select = (id: string | null) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)

      if (id) {
        next.set("thread", id)
      } else {
        next.delete("thread")
      }

      return next
    })
  }

  // Desktop automatically selects the most recent thread.
  useEffect(() => {
    if (
      !selectedId &&
      threads?.length &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      select(threads[0].id)
    }
  }, [threads, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  if (isPending) {
    return (
      <div className="grid h-[calc(100dvh-13rem)] min-h-[32rem] max-h-[56rem] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">

        <div className="border-r border-border p-5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-6 h-11 w-full rounded-xl" />

          <div className="mt-8 space-y-6">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden flex-col lg:flex">
          <div className="border-b border-border p-5">
            <Skeleton className="h-10 w-48" />
          </div>

          <div className="flex-1 space-y-5 p-8">
            <Skeleton className="h-15 w-3/5 rounded-2xl" />
            <Skeleton className="ml-auto h-20 w-1/2 rounded-2xl" />
            <Skeleton className="h-14 w-2/5 rounded-2xl" />
          </div>

          <div className="border-t border-border p-5">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // NO CONVERSATIONS
  // ----------------------------------------------------------

  if (!threads?.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border/70 px-6 py-5">
          <h2 className="font-heading text-lg font-semibold">
            Messages
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Your conversations in one place.
          </p>
        </div>

        <div className="py-8">
          <EmptyState
            icon={InboxIcon}
            title="No conversations yet"
            description={
              perspective === "renter"
                ? "When you message a landlord from a listing, the conversation shows up here."
                : "Inquiries from renters about your listings will appear here."
            }
            action={emptyAction}
          />
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // MESSAGING WORKSPACE
  // ----------------------------------------------------------

  return (
    <div
      className={cn(
        "grid h-[calc(100dvh-13rem)] min-h-[32rem] max-h-[56rem]",
        "min-w-0 overflow-hidden rounded-2xl",
        "border border-border bg-card",
        "shadow-[0_20px_65px_-45px_rgba(0,0,0,0.25)]",
        "lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]",
        "xl:grid-cols-[minmax(19rem,23rem)_minmax(0,1fr)]",
      )}
    >
      {/* Conversation list */}
      <aside
        aria-label="Conversations"
        className={cn(
          "min-h-0 min-w-0 border-r border-border",
          selected
            ? "hidden lg:block"
            : "block",
        )}
      >
        <ThreadList
          threads={threads}
          selectedId={selected?.id}
          perspective={perspective}
          onSelect={(id) => select(id)}
        />
      </aside>

      {/* Active conversation */}
      <div
        className={cn(
          "min-h-0 min-w-0",
          !selected && "hidden lg:block",
        )}
      >
        {selected ? (
          <Conversation
            key={selected.id}
            thread={selected}
            perspective={perspective}
            currentUserId={currentUserId}
            onBack={() => select(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-muted/15 p-8 text-center">

            <div className="flex size-17 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
              <MessageSquare
                className="size-7"
                strokeWidth={1.4}
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight text-foreground">
              Your conversations, all here.
            </h2>

            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Select a conversation from the sidebar
              to read messages and continue where you left off.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
