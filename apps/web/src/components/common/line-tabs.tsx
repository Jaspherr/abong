import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface LineTab<T extends string> {
  value: T
  label: string
  count?: number
}

/** Underlined tabs on a hairline, with optional counts. Scrolls sideways when the labels don't fit. */
export function LineTabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  tabs: LineTab<T>[]
  label: string
  className?: string
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className={className}>
      <div className="overflow-x-auto border-b border-border scrollbar-none">
        <TabsList variant="line" aria-label={label} className="gap-6 p-0 group-data-horizontal/tabs:h-auto sm:gap-8">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              // The content below changes in place, so there is no tab panel to point at.
              aria-controls={undefined}
              className="h-auto flex-none gap-2 rounded-none px-0 pt-1 pb-3 text-muted-foreground after:bg-primary group-data-horizontal/tabs:after:bottom-0 data-active:font-semibold data-active:text-foreground"
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-caption leading-none font-medium tabular",
                    tab.value === value ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
