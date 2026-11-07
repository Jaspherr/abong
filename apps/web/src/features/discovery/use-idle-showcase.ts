import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { useIsDesktop, useMediaQuery } from "@/hooks/use-media-query";

/** How long each item stays up while idle. */
const INTERVAL_MS = 4500;
/** The pause after someone stops interacting, before the cycle moves on. */
const RESUME_DELAY_MS = 2000;

function shuffled<T>(items: readonly T[]) {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

/** Deals every item once before reshuffling, and never the one already showing. */
function drawNext<T>(deck: T[], items: readonly T[], current: T) {
  if (deck.length === 0) deck.push(...shuffled(items));
  const next = deck.pop()!;
  if (next !== current) return next;

  if (deck.length === 0) deck.push(...shuffled(items.filter((item) => item !== current)));
  const other = deck.pop()!;
  deck.unshift(next);
  return other;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Shows one item at a time, moving through `items` in random order while nobody is using
 * them. The timer only exists while it should run, so every reason to stop (hover, focus,
 * a hidden tab, scrolled away, a small screen, reduced motion) clears it, and unmounting
 * does too. `items` must be a stable reference.
 *
 * `containerProps` goes on the wrapper, for focus and the on-screen check. `holdProps` goes
 * only on the controls that should hold the cycle while hovered: on a whole section, a mouse
 * left resting after scrolling would stop the cycle from ever running.
 */
export function useIdleShowcase<T>(items: readonly T[]) {
  const [shown, setShown] = useState({ item: items[0] as T, auto: false });
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);

  const isDesktop = useIsDesktop();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(items[0] as T);
  const deckRef = useRef<T[]>([]);
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

  const running =
    !hovering &&
    !focused &&
    inView &&
    pageVisible &&
    isDesktop &&
    !reducedMotion &&
    items.length > 1;

  useEffect(() => {
    if (!running) return;

    const firstDelay = justReleasedRef.current ? RESUME_DELAY_MS : INTERVAL_MS;
    justReleasedRef.current = false;

    let timer: number;
    const advance = () => {
      const next = drawNext(deckRef.current, items, currentRef.current);
      currentRef.current = next;
      setShown({ item: next, auto: true });
      timer = window.setTimeout(advance, INTERVAL_MS);
    };
    timer = window.setTimeout(advance, firstDelay);
    return () => window.clearTimeout(timer);
  }, [running, items]);

  /** Shows an item someone asked for, straight away. */
  const show = (item: T) => {
    if (item === currentRef.current) return;
    currentRef.current = item;
    setShown({ item, auto: false });
  };

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
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      justReleasedRef.current = true;
      setFocused(false);
    },
  };

  return { ...shown, show, containerRef, containerProps, holdProps };
}
