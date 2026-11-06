import { FileCheck2, Upload, X } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Demo document field. It records only the chosen file's name so the flow can
 * be shown end to end; the file itself is never read, uploaded or stored.
 */
export function MockDocumentPicker({
  label,
  fileName,
  onChange,
  invalid,
}: {
  label: string
  fileName: string | null
  onChange: (fileName: string | null) => void
  invalid?: boolean
}) {
  const id = useId()
  if (fileName) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-3 py-2.5">
        <FileCheck2 className="size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{fileName}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="grid size-8 place-items-center rounded-full hover:bg-white/70" aria-label={`Remove ${label}`}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition-colors hover:border-primary/40 hover:bg-muted/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        invalid ? "border-destructive/60" : "border-border",
      )}
    >
      <Upload className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">JPG, PNG or PDF. Demo build: the file isn't uploaded.</span>
      </span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onChange(file.name)
          e.target.value = ""
        }}
      />
    </label>
  )
}
