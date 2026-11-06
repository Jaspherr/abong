import { Building, GraduationCap, Landmark, MapPin, Search, X } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { places } from "@/services"
import type { PlaceSuggestion } from "@/types"

const KIND_ICON = { municipality: Building, university: GraduationCap, landmark: Landmark } as const
const KIND_GROUP = { municipality: "Cities and towns", university: "Schools", landmark: "Landmarks" } as const

export function PlaceCombobox({
  value,
  onChange,
  placeholder = "Search city, school or landmark",
  className,
  size = "default",
  label = "Where do you want to live?",
}: {
  value: PlaceSuggestion | null
  onChange: (place: PlaceSuggestion | null) => void
  placeholder?: string
  className?: string
  size?: "default" | "lg"
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const labelId = useId()
  const suggestions = useMemo(() => places.suggest(query), [query])
  const grouped = useMemo(
    () =>
      (["municipality", "university", "landmark"] as const)
        .map((kind) => ({ kind, items: suggestions.filter((s) => s.kind === kind) }))
        .filter((g) => g.items.length),
    [suggestions],
  )
  const ValueIcon = value ? KIND_ICON[value.kind] : MapPin

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-labelledby={labelId}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-input bg-card text-left transition-colors outline-none hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              size === "lg" ? "h-14 px-4 text-base" : "h-10 px-3 text-sm",
              value && "pr-11",
            )}
          >
            <ValueIcon className={cn("shrink-0 text-primary", size === "lg" ? "size-5" : "size-4")} aria-hidden="true" />
            <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
              {value ? value.label : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Clear ${value.label}`}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0" sideOffset={6}>
        <Command shouldFilter={false} label={label}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Dagupan, UPang, Capitol…" autoFocus />
          <CommandList className="max-h-80">
            <CommandEmpty>
              <span className="flex flex-col items-center gap-1 py-2">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                No places in Pangasinan match “{query}”.
              </span>
            </CommandEmpty>
            {grouped.map((group) => (
              <CommandGroup key={group.kind} heading={KIND_GROUP[group.kind]}>
                {group.items.map((item) => {
                  const Icon = KIND_ICON[item.kind]
                  return (
                    <CommandItem
                      key={`${item.kind}-${item.id}`}
                      value={`${item.kind}-${item.id}`}
                      onSelect={() => {
                        onChange(item)
                        setQuery("")
                        setOpen(false)
                      }}
                      className="gap-3 py-2"
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{item.label}</span>
                        {item.detail && <span className="truncate text-xs text-muted-foreground">{item.detail}</span>}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
