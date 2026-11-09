import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { REVIEW_ASPECTS, REVIEW_KIND, REVIEW_RULES } from "@/constants/reviews"
import { cn } from "@/lib/utils"
import { RESIDENCE_ASPECTS, REVIEW_BODY, VIEWING_ASPECTS, reviewsService, type MyReview } from "@/services"
import type { ReviewAspect, ReviewKind } from "@/types"
import { reviewErrorText } from "./review-utils"
import { StarRatingInput } from "./stars"

type Target =
  | { mode: "create"; kind: ReviewKind; sourceId: string; propertyName: string; landlordName: string }
  | { mode: "edit"; review: MyReview }

/** Write or edit a review. Every aspect is optional, so renters rate only what they experienced. */
export function ReviewDialog({ target, children }: { target: Target; children: ReactNode }) {
  const client = useQueryClient()
  const bodyId = useId()
  const kind = target.mode === "create" ? target.kind : target.review.kind
  const propertyName = target.mode === "create" ? target.propertyName : target.review.propertyName
  const aspects = kind === "residence" ? RESIDENCE_ASPECTS : VIEWING_ASPECTS

  const initial = () =>
    target.mode === "edit"
      ? {
          overall: target.review.overall as number | undefined,
          aspects: { ...target.review.aspects },
          recommend: target.review.recommend,
          body: target.review.body ?? "",
        }
      : { overall: undefined, aspects: {} as Partial<Record<ReviewAspect, number>>, recommend: undefined as boolean | undefined, body: "" }

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [serverError, setServerError] = useState<string>()

  const bodyLength = values.body.trim().length
  const errors = {
    overall: values.overall === undefined ? "Choose an overall rating." : undefined,
    body:
      bodyLength > 0 && bodyLength < REVIEW_BODY.min
        ? `Write a bit more (${REVIEW_BODY.min}+ characters), or leave it empty.`
        : undefined,
  }
  const show = (e: string | undefined) => (attempted ? e : undefined)

  const save = useMutation({
    mutationFn: () => {
      const payload = { overall: values.overall!, aspects: values.aspects, recommend: values.recommend, body: values.body }
      return target.mode === "create"
        ? reviewsService.create({ kind: target.kind, sourceId: target.sourceId, ...payload })
        : reviewsService.update(target.review.id, payload)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["reviews"] })
      client.invalidateQueries({ queryKey: ["rentals"] })
      setOpen(false)
      toast.success(target.mode === "create" ? "Review published" : "Review updated")
    },
    onError: (e) => setServerError(reviewErrorText(e)),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setValues(initial())
          setAttempted(false)
          setServerError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {target.mode === "edit" ? "Edit your review" : kind === "residence" ? "Review your stay" : "Review your viewing"}
          </DialogTitle>
          <DialogDescription>
            {propertyName}
            {target.mode === "create" && `, ${target.landlordName}`}. Published as{" "}
            {REVIEW_KIND[kind].badge.toLowerCase()}, with your first name and initial.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setAttempted(true)
            setServerError(undefined)
            if (!errors.overall && !errors.body) save.mutate()
          }}
        >
          <StarRatingInput
            size="lg"
            legend={kind === "residence" ? "Overall rental experience" : "Overall viewing experience"}
            value={values.overall}
            onChange={(overall) => setValues((v) => ({ ...v, overall }))}
            error={show(errors.overall)}
          />

          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-meta text-muted-foreground">
              Rate only what you experienced{kind === "viewing" ? ". A viewing can't be rated on day-to-day living." : "."}
            </p>
            {aspects.map((aspect) => (
              <StarRatingInput
                key={aspect}
                optional
                legend={REVIEW_ASPECTS[aspect].label}
                hint={REVIEW_ASPECTS[aspect].hint}
                value={values.aspects[aspect]}
                onChange={(value) => setValues((v) => ({ ...v, aspects: { ...v.aspects, [aspect]: value } }))}
              />
            ))}
          </div>

          {kind === "residence" && (
            <fieldset className="border-t border-border pt-4">
              <legend className="text-meta font-semibold">Would you recommend living here?</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-meta">
                {([
                  [true, "Yes"],
                  [false, "No"],
                  [undefined, "Rather not say"],
                ] as const).map(([value, label]) => (
                  <label key={label} className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`${bodyId}-recommend`}
                      checked={values.recommend === value}
                      onChange={() => setValues((v) => ({ ...v, recommend: value }))}
                      className="size-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-1.5 border-t border-border pt-4">
            <label htmlFor={bodyId} className="text-meta font-semibold">
              Your review <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id={bodyId}
              rows={5}
              maxLength={REVIEW_BODY.max}
              value={values.body}
              onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
              aria-invalid={!!show(errors.body)}
              aria-describedby={`${bodyId}-hint`}
              placeholder={kind === "residence" ? "What was it like to live here?" : "How did the viewing go?"}
            />
            <p id={`${bodyId}-hint`} className={cn("flex justify-between gap-3 text-caption", show(errors.body) ? "text-destructive" : "text-muted-foreground")}>
              <span>{show(errors.body) ?? "Leave out phone numbers, addresses and other private details."}</span>
              <span className="shrink-0 tabular">
                {values.body.length}/{REVIEW_BODY.max}
              </span>
            </p>
          </div>

          <details className="text-meta text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Review rules</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {REVIEW_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </details>

          {serverError && (
            <p role="alert" className="text-meta text-destructive">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {target.mode === "create" ? "Publish review" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
