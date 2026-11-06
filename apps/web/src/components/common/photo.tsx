import { ImageOff } from "lucide-react"
import { useState, type ImgHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src?: string
  alt: string
  /** Eager-load above-the-fold images only. */
  priority?: boolean
  className?: string
  imgClassName?: string
}

/** Image with a calm placeholder while loading and a fallback when the file is missing. */
export function Photo({ src, alt, priority, className, imgClassName, ...rest }: PhotoProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error")
  const [shownSrc, setShownSrc] = useState(src)
  // Reused instances (e.g. the map preview card) must not keep the previous image's state.
  if (src !== shownSrc) {
    setShownSrc(src)
    setState(src ? "loading" : "error")
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {state !== "error" && src && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "size-full object-cover transition-opacity duration-300",
            state === "loaded" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          {...rest}
        />
      )}
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground" role="img" aria-label={alt}>
          <ImageOff className="size-6 opacity-60" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
