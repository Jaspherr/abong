import { toast } from "sonner"
import type { Listing } from "@/types"

/** Native share sheet on mobile, clipboard copy elsewhere. */
export async function shareListing(listing: Pick<Listing, "name">) {
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: listing.name, url })
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success("Link copied")
  } catch (error) {
    if ((error as Error).name !== "AbortError") toast.error("Couldn't share this link. Copy it from the address bar.")
  }
}
