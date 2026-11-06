import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, BellOff, BookmarkPlus, Loader2, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { describeFilters } from "@/features/discovery/describe-filters"
import { searchUrl } from "@/features/discovery/search-params"
import { formatRelative } from "@/lib/format"
import { favoritesService } from "@/services"
import type { SavedSearch, SearchFilters } from "@/types"

const KEY = ["saved-searches"] as const

export function SaveSearchButton({ filters }: { filters: SearchFilters }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const save = useMutation({
    mutationFn: () => favoritesService.saveSearch(name.trim() || describeFilters(filters), filters),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: KEY })
      setOpen(false)
      toast.success("Search saved", { description: "We'll show new matches on your Saved page." })
    },
    onError: () => toast.error("Couldn't save this search. Try again."),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setName(describeFilters(filters))
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BookmarkPlus aria-hidden="true" />
          Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>Come back to these filters anytime from your Saved page.</DialogDescription>
        </DialogHeader>
        <form
          id="save-search"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
          className="space-y-1.5"
        >
          <Label htmlFor="search-name">Name</Label>
          <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </form>
        <DialogFooter>
          <Button type="submit" form="save-search" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SavedSearchList() {
  const client = useQueryClient()
  const { data = [] } = useQuery({ queryKey: KEY, queryFn: favoritesService.listSearches })
  const refresh = () => client.invalidateQueries({ queryKey: KEY })
  const update = useMutation({ mutationFn: (s: SavedSearch) => favoritesService.updateSearch(s.id, { alerts: !s.alerts }), onSuccess: refresh, onError: () => toast.error("Couldn't change alerts. Try again.") })
  const remove = useMutation({
    mutationFn: (id: string) => favoritesService.deleteSearch(id),
    onSuccess: () => {
      refresh()
      toast("Saved search removed")
    },
    onError: () => toast.error("Couldn't remove this search. Try again."),
  })

  if (!data.length) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Search className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Use “Save search” on the search page to keep filters you check often.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {data.map((s) => (
        <li key={s.id} className="flex items-center gap-2 py-3">
          <Link to={searchUrl(s.filters)} className="min-w-0 flex-1 hover:text-primary">
            <span className="block truncate text-sm font-medium">{s.name}</span>
            <span className="block text-xs text-muted-foreground">Saved {formatRelative(s.createdAt)}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => update.mutate(s)}
            aria-label={s.alerts ? `Turn off alerts for ${s.name}` : `Turn on alerts for ${s.name}`}
            aria-pressed={s.alerts}
          >
            {s.alerts ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(s.id)} aria-label={`Delete ${s.name}`}>
            <Trash2 aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
