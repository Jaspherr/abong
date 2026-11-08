import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * How long each item stays up while idle: about 3s for the drawing to build, then
 * 3.5s to take in the finished structure before the next one.
 */
const INTERVAL_MS = 6500;
/** The pause after someone stops interacting, before the cycle moves on. */
const RESUME_DELAY_MS = 2000;

/** Which way the last change travelled: 1 is forward, -1 is back. */
export type ShowcaseDirection = 1 | -1;

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Shows one item at a time, stepping through `items` in order (wrapping at the end) while
 * nobody is using them. The timer only exists while it should run, so every reason to stop
 * (hover, focus, a hidden tab, scrolled away, reduced motion, the pause button) clears it,
 * and unmounting does too. Each change restarts it, so a manual pick never gets cut short
 * by a tick that was already due. `items` must be a stable reference.
 *
 * `containerProps` goes on the wrapper, for focus and the on-screen check. `holdProps` goes
 * only on the parts that should hold the cycle while hovered: on a whole section, a mouse
 * left resting after scrolling would stop the cycle from ever running.
 */
export function useIdleShowcase<T>(items: readonly T[]) {
  const [shown, setShown] = useState<{
    index: number;
    direction: ShowcaseDirection;
    /** "auto" for changes nobody asked for, "picked" for someone's choice. */
    cause: "start" | "auto" | "picked";
  }>({ index: 0, direction: 1, cause: "start" });
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const justReleasedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      // Updates can arrive in a batch during page load, so only the last one is current.
      (entries) => setInView(entries.at(-1)?.isIntersecting ?? false),
      { threshold: 0.2 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /** Whether the cycle could run at all; the pause button only makes sense when it can. */
  const canAutoplay = !reducedMotion && items.length > 1;
  const running =
    canAutoplay && !paused && !hovering && !focused && inView && pageVisible;

  useEffect(() => {
    if (!running) return;

    // Something someone picked always gets a full turn, even when the mouse that picked it
    // leaves straight after; the short resume is for items the cycle brought up.
    const delay =
      justReleasedRef.current && shown.cause !== "picked"
        ? RESUME_DELAY_MS
        : INTERVAL_MS;
    justReleasedRef.current = false;

    const timer = window.setTimeout(() => {
      setShown({
        index: (shown.index + 1) % items.length,
        direction: 1,
        cause: "auto",
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [running, items, shown]);

  /** Shows the item at `index` straight away, travelling in `direction`. */
  const showIndex = (index: number, direction?: ShowcaseDirection) => {
    const next = ((index % items.length) + items.length) % items.length;
    setShown((current) =>
      next === current.index
        ? current
        : {
            index: next,
            direction: direction ?? (next > current.index ? 1 : -1),
            cause: "picked",
          },
    );
  };

  /** Moves one item forward or back, wrapping around the ends. */
  const step = (direction: ShowcaseDirection) =>
    showIndex(shown.index + direction, direction);

  const holdProps = {
    // Touch has no "leave", so a tap would hold the cycle forever.
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== "touch") setHovering(true);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      justReleasedRef.current = true;
      setHovering(false);
    },
  };

  const containerProps = {
    // Only keyboard focus holds the cycle. A click or tap also focuses what it hit, and that
    // focus stays put until the next click elsewhere, which would stop the cycle for good.
    // A click is a pick instead, with its own longer hold before moving on.
    onFocus: (event: FocusEvent<HTMLDivElement>) => {
      setFocused(event.target.matches(":focus-visible"));
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      justReleasedRef.current = true;
      setFocused(false);
    },
  };

  return {
    item: items[shown.index] as T,
    index: shown.index,
    direction: shown.direction,
    /** True when the change wasn't asked for, so it can arrive more gently. */
    auto: shown.cause === "auto",
    /** False until the first change, so nothing animates on arrival. */
    moved: shown.cause !== "start",
    running,
    canAutoplay,
    paused,
    setPaused,
    showIndex,
    step,
    containerRef,
    containerProps,
    holdProps,
  };
}
