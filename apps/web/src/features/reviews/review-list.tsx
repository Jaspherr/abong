import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Flag, Loader2 } from "lucide-react"
import { useId, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PATHS } from "@/constants/app"
import { REVIEW_ASPECTS, REVIEW_KIND } from "@/constants/reviews"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { RESPONSE_BODY, reviewsService, type PublicReview } from "@/services"
import type { ReviewAspect } from "@/types"
import { ReportReviewDialog } from "./report-review-dialog"
import { Stars } from "./stars"

import { reviewErrorText as errorText } from "./review-utils"

function ReplyForm({ review, onDone }: { review: PublicReview; onDone: () => void }) {
  const client = useQueryClient()
  const id = useId()
  const [body, setBody] = useState(review.response?.body ?? "")
  const [error, setError] = useState<string>()
  const save = useMutation({
    mutationFn: () => reviewsService.respond(review.id, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["reviews"] })
      toast.success(review.response ? "Reply updated" : "Reply posted")
      onDone()
    },
    onError: (e) => setError(errorText(e)),
  })
  return (
    <form
      noValidate
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim().length < RESPONSE_BODY.min) {
          setError(`Write at least ${RESPONSE_BODY.min} characters.`)
          return
        }
        setError(undefined)
        save.mutate()
      }}
    >
      <label htmlFor={id} className="text-meta font-semibold">
        Your public reply
      </label>
      <Textarea
        id={id}
        value={body}
        rows={3}
        maxLength={RESPONSE_BODY.max}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className={cn("text-caption", error ? "text-destructive" : "text-muted-foreground")}>
        {error ?? "Anyone can read your reply. Thank the renter, explain, or say what changed. Leave out personal details."}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {review.response ? "Save reply" : "Post reply"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function ReviewItem({ review, landlordName, showProperty }: { review: PublicReview; landlordName: string; showProperty: boolean }) {
  const [replying, setReplying] = useState(false)
  const aspects = Object.entries(review.aspects) as [ReviewAspect, number][]
  return (
    <article className="min-w-0 py-6 first:pt-0" aria-label={`Review by ${review.authorLabel}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Stars value={review.overall} />
        <StatusBadge tone={review.kind === "residence" ? "brand" : "neutral"}>{REVIEW_KIND[review.kind].badge}</StatusBadge>
      </div>
      <p className="mt-2 text-meta text-muted-foreground">
        {review.authorLabel}, {formatDate(review.createdAt, "MMMM yyyy")}
        {review.editedAt && <span>, edited</span>}
        {showProperty && (
          <>
            {" "}
            about{" "}
            <Link to={PATHS.listing(review.listingId)} className="font-medium text-foreground underline decoration-ink/25 underline-offset-4 hover:decoration-foreground">
              {review.propertyName}
            </Link>
          </>
        )}
      </p>
      {review.body && <p className="mt-3 max-w-prose text-body whitespace-pre-line">{review.body}</p>}
      {(aspects.length > 0 || review.recommend !== undefined) && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-meta">
          {aspects.map(([aspect, value]) => (
            <div key={aspect} className="flex gap-1.5">
              <dt className="text-muted-foreground">{REVIEW_ASPECTS[aspect].label}</dt>
              <dd className="font-semibold tabular">{value}/5</dd>
            </div>
          ))}
          {review.recommend !== undefined && (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Would recommend</dt>
              <dd className="font-semibold">{review.recommend ? "Yes" : "No"}</dd>
            </div>
          )}
        </dl>
      )}

      {review.response && !replying && (
        <div className="mt-4 border-l-2 border-border pl-4">
          <p className="text-meta font-semibold">
            Reply from {landlordName}
            <span className="font-normal text-muted-foreground">, {formatDate(review.response.updatedAt ?? review.response.createdAt, "MMMM yyyy")}</span>
          </p>
          <p className="mt-1 max-w-prose text-body whitespace-pre-line text-foreground/85">{review.response.body}</p>
        </div>
      )}

      {replying ? (
        <ReplyForm review={review} onDone={() => setReplying(false)} />
      ) : (
        (review.canRespond || review.canReport) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {review.canRespond && (
              <Button size="sm" variant="ghost" className="-ml-3" onClick={() => setReplying(true)}>
                {review.response ? "Edit reply" : "Reply publicly"}
              </Button>
            )}
            {review.canReport && (
              <ReportReviewDialog reviewId={review.id}>
                <Button size="sm" variant="ghost" className={review.canRespond ? undefined : "-ml-3"}>
                  <Flag aria-hidden="true" />
                  Report
                </Button>
              </ReportReviewDialog>
            )}
          </div>
        )
      )}
    </article>
  )
}

/** Published reviews, newest first. `showProperty` names the property on landlord-wide lists. */
export function ReviewList({
  reviews,
  landlordName,
  showProperty = false,
}: {
  reviews: PublicReview[]
  landlordName: string
  showProperty?: boolean
}) {
  if (!reviews.length) return null
  return (
    <div className="divide-y divide-border">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} landlordName={landlordName} showProperty={showProperty} />
      ))}
    </div>
  )
}

/** Explains where the reviews come from, so readers can judge them. */
export function ReviewSourceNote() {
  return (
    <p className="text-caption text-muted-foreground">
      Only renters with a stay both sides confirmed, or a completed viewing, can review. Landlords can reply but can't
      remove reviews.
    </p>
  )
}

