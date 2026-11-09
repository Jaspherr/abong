import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useId, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/features/auth/auth-context"
import { qk } from "@/lib/query"
import { cn } from "@/lib/utils"
import { profilePhotosService } from "@/services"
import type { PhotoVisibility } from "@/types"
import { PhotoCropDialog } from "./photo-crop-dialog"
import { ACCEPTED_PHOTO_TYPES, PhotoError, decodePhoto, exportCrop, type Crop } from "./photo-image"

const VISIBILITY: Record<"renter" | "landlord", { value: PhotoVisibility; label: string; hint: string }[]> = {
  renter: [
    {
      value: "contacts",
      label: "Landlords you're in touch with",
      hint: "Once they reply to your inquiry or confirm your viewing. Never on public pages.",
    },
    { value: "private", label: "Only you", hint: "Landlords see your initials instead." },
  ],
  landlord: [
    { value: "public", label: "Everyone", hint: "On your public page and listings, and in messages." },
    {
      value: "contacts",
      label: "Renters you're in touch with",
      hint: "Once you reply to their inquiry or confirm their viewing.",
    },
    { value: "private", label: "Only you", hint: "Renters see your initials instead." },
  ],
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again."

/**
 * Add, reposition, replace or remove your own profile photo, and choose who sees it.
 * The photo is optional and is never treated as proof of identity.
 */
export function ProfilePhotoControl({
  name,
  avatarClassName,
  children,
}: {
  name: string
  avatarClassName?: string
  /** Shown beside the avatar, usually the name and account type. */
  children?: ReactNode
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const statusId = useId()
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [stage, setStage] = useState<"preparing" | "saving" | null>(null)
  const [pickError, setPickError] = useState<string>()
  const [saveError, setSaveError] = useState<string>()
  const [picking, setPicking] = useState(false)

  const mine = useQuery({ queryKey: qk.myPhoto(user!.id), queryFn: profilePhotosService.getMine })
  const role = user!.role === "landlord" ? "landlord" : "renter"
  const options = VISIBILITY[role]

  const refresh = () => client.invalidateQueries({ queryKey: ["photos"] })

  const closeCrop = () => {
    image?.close()
    setImage(null)
    setStage(null)
    setSaveError(undefined)
  }

  const save = useMutation({
    mutationFn: async (crop: Crop) => {
      setStage("preparing")
      const dataUrl = await exportCrop(image!, crop)
      setStage("saving")
      return profilePhotosService.setMine(dataUrl)
    },
    onSuccess: () => {
      refresh()
      closeCrop()
      toast.success("Photo saved")
    },
    onError: (error) => {
      setStage(null)
      setSaveError(errorMessage(error))
    },
  })

  const remove = useMutation({
    mutationFn: profilePhotosService.removeMine,
    onSuccess: () => {
      refresh()
      toast.success("Photo removed")
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const setVisibility = useMutation({
    mutationFn: profilePhotosService.setVisibility,
    onSuccess: () => {
      refresh()
      toast.success("Photo visibility saved")
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setPickError(undefined)
    setPicking(true)
    try {
      setImage(await decodePhoto(file))
    } catch (error) {
      setPickError(error instanceof PhotoError ? error.message : "That photo couldn't be opened. Try another one.")
    } finally {
      setPicking(false)
      // Picking the same file again should still trigger a change.
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const hasPhoto = !!mine.data?.url

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
        <UserAvatar name={name} src={mine.data?.url} className={cn("size-18 text-2xl sm:size-20", avatarClassName)} />
        {children}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mine.isPending || picking}
          aria-describedby={statusId}
          onClick={() => inputRef.current?.click()}
        >
          {picking && <Loader2 className="animate-spin" aria-hidden="true" />}
          {hasPhoto ? "Change photo" : "Add photo"}
        </Button>
        {hasPhoto && (
          <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
            {remove.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Remove
          </Button>
        )}
      </div>

      <div id={statusId} aria-live="polite" className="mt-2 text-meta">
        {pickError ? (
          <p className="text-destructive">{pickError}</p>
        ) : (
          <p className="text-muted-foreground">
            Optional. JPEG, PNG or WebP up to 10 MB. Location and camera details are removed.
          </p>
        )}
      </div>

      {hasPhoto && (
        <fieldset className="mt-4" disabled={setVisibility.isPending}>
          <legend className="mb-1.5 text-meta font-semibold">Who can see it</legend>
          <RadioGroup
            value={mine.data?.visibility}
            onValueChange={(v) => setVisibility.mutate(v as PhotoVisibility)}
            className="gap-0.5"
          >
            {options.map((option) => (
              <Label
                key={option.value}
                htmlFor={`photo-visibility-${option.value}`}
                className="-mx-2 flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 font-normal hover:bg-muted"
              >
                <RadioGroupItem id={`photo-visibility-${option.value}`} value={option.value} className="mt-0.5" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-meta font-medium">{option.label}</span>
                  <span className="text-caption text-muted-foreground">{option.hint}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <p className="mt-2 text-caption text-muted-foreground">
            Abong admins can also see it when looking into a report. A photo doesn't verify who you are
            {role === "landlord" ? "; verification is a separate step." : "."}
          </p>
        </fieldset>
      )}

      <PhotoCropDialog
        image={image}
        saving={stage}
        error={saveError}
        onCancel={closeCrop}
        onSave={(crop) => save.mutate(crop)}
      />
    </div>
  )
}
