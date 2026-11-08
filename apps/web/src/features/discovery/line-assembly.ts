/**
 * Builds a line drawing out of its own lines, and takes it apart again.
 *
 * Each drawing is split into single pieces: every straight segment of every path, each
 * edge of a plain rectangle, each curve, and the few small shapes that read as one thing
 * (a doorknob, a pillow). The pieces are copies laid over the hidden original, with no
 * transform once they land, so a finished building is the original drawing line for line.
 *
 * Every piece flies on its own Web Animation: transforms and opacity only, along a
 * curved path, at its own depth (scale), rotation, speed and start time. Foundations land
 * first, then walls rise, floors and roofs close over them, and fine detail comes last.
 * The easing slows each piece almost to a stop just short of its place, then snaps it in.
 *
 * Interruptions are safe because a piece always starts its next flight from wherever it
 * is now: its current transform is read off the running animation, the animation is
 * dropped, and a new one carries on from that exact state. Nothing here touches React
 * state, so a whole flight costs no renders.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPES = "path, rect, circle, ellipse, line, polyline, polygon";

/** A piece's pose relative to where it belongs: offset in drawing units, turn in degrees, scale for depth. */
type Pose = { x: number; y: number; r: number; s: number; o: number };

const AT_REST: Pose = { x: 0, y: 0, r: 0, s: 1, o: 1 };

type Archetype = "ground" | "column" | "roof" | "frame" | "detail";

type Piece = {
  el: SVGGeometryElement;
  cx: number;
  cy: number;
  length: number;
  archetype: Archetype;
  /** 0 to 1: where this piece falls in the build, from the ground up. */
  order: number;
  /** Whether it's meant to be visible once current flights end. */
  placed: boolean;
  flight: Animation | null;
};

type Bounds = { left: number; top: number; right: number; bottom: number };

// ─── Geometry ────────────────────────────────────────────────────────────────

type Segment = { d: string; points: [number, number][] };

/** Splits a path into one segment per drawing command. Handles the commands the drawings use, absolute or relative. */
function splitPath(d: string): Segment[] {
  const tokens = d.match(/[MLHVCZmlhvcz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const segments: Segment[] = [];
  let i = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const isCommand = (token: string | undefined) => !!token && /[a-z]/i.test(token);
  const read = () => Number(tokens[i++]);
  const line = (toX: number, toY: number) => {
    if (toX !== x || toY !== y) {
      segments.push({ d: `M${x} ${y}L${toX} ${toY}`, points: [[x, y], [toX, toY]] });
    }
    x = toX;
    y = toY;
  };

  while (i < tokens.length) {
    if (isCommand(tokens[i])) command = tokens[i++]!;
    else if (!command || command === "Z" || command === "z") {
      i++;
      continue;
    }
    const relative = command === command.toLowerCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;

    switch (command.toUpperCase()) {
      case "M":
        x = ox + read();
        y = oy + read();
        startX = x;
        startY = y;
        // Pairs after a move are lines.
        command = relative ? "l" : "L";
        break;
      case "L": {
        const toX = ox + read();
        line(toX, oy + read());
        break;
      }
      case "H":
        line(ox + read(), y);
        break;
      case "V":
        line(x, oy + read());
        break;
      case "C": {
        const c = [read(), read(), read(), read(), read(), read()];
        const p: [number, number][] = [
          [x, y],
          [ox + c[0]!, oy + c[1]!],
          [ox + c[2]!, oy + c[3]!],
          [ox + c[4]!, oy + c[5]!],
        ];
        segments.push({
          d: `M${x} ${y}C${p[1]!.join(" ")} ${p[2]!.join(" ")} ${p[3]!.join(" ")}`,
          points: p,
        });
        [x, y] = p[3]!;
        break;
      }
      case "Z":
        line(startX, startY);
        break;
      default:
        // An unknown command: skip its numbers rather than misread them.
        while (i < tokens.length && !isCommand(tokens[i])) i++;
    }
  }
  return segments;
}

const num = (el: Element, name: string) => Number(el.getAttribute(name) ?? 0);

/** One piece per edge for plain rectangles; rounded ones read as one object, so they stay whole. */
function piecesOf(el: SVGGeometryElement): { node: SVGGeometryElement; points: [number, number][] }[] {
  const tag = el.tagName.toLowerCase();

  if (tag === "path") {
    return splitPath(el.getAttribute("d") ?? "").map(({ d, points }) => {
      const node = document.createElementNS(SVG_NS, "path");
      node.setAttribute("d", d);
      return { node, points };
    });
  }

  if (tag === "rect" && !num(el, "rx") && !num(el, "ry")) {
    const [x, y, w, h] = [num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height")];
    const d = `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return splitPath(d).map(({ d: segment, points }) => {
      const node = document.createElementNS(SVG_NS, "path");
      node.setAttribute("d", segment);
      return { node, points };
    });
  }

  const node = el.cloneNode(false) as SVGGeometryElement;
  let points: [number, number][];
  if (tag === "rect") {
    const [x, y, w, h] = [num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height")];
    points = [[x, y], [x + w, y + h]];
  } else if (tag === "circle" || tag === "ellipse") {
    const [cx, cy] = [num(el, "cx"), num(el, "cy")];
    const rx = num(el, tag === "circle" ? "r" : "rx");
    const ry = num(el, tag === "circle" ? "r" : "ry");
    points = [[cx - rx, cy - ry], [cx + rx, cy + ry]];
  } else {
    const box = el.getBBox();
    points = [[box.x, box.y], [box.x + box.width, box.y + box.height]];
  }
  return [{ node, points }];
}

/** The product of the `opacity` attributes between a shape and the drawing's root. */
function groupOpacity(el: Element, root: Element) {
  let opacity = 1;
  for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
    const value = node.getAttribute("opacity");
    if (value !== null) opacity *= Number(value);
  }
  return opacity;
}

// ─── Choreography ────────────────────────────────────────────────────────────

const random = (min: number, max: number) => min + Math.random() * (max - min);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Decides what part of the building a piece is, which sets its entrance and its turn in the build. */
function classify(
  points: [number, number][],
  strokeWidth: number,
  bounds: Bounds,
): { archetype: Archetype; order: number } {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const span = Math.hypot(width, height);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const drawingHeight = Math.max(1, bounds.bottom - bounds.top);
  /** 0 at the ground line, 1 at the top of the drawing. */
  const rise = (y: number) => clamp((bounds.bottom - y) / drawingHeight, 0, 1);
  const jitter = random(-0.035, 0.035);

  if (top >= bounds.bottom - 12 && width > height * 4) {
    return { archetype: "ground", order: clamp(random(0, 0.05), 0, 1) };
  }
  if (strokeWidth < 1 || span < 16) {
    // Detail follows the structure around it, a beat behind.
    return { archetype: "detail", order: clamp(0.3 + rise((top + bottom) / 2) * 0.62 + jitter, 0, 1) };
  }
  if (height > width * 2 && height > 40) {
    // Walls and columns rise early, from where they stand.
    return { archetype: "column", order: clamp(0.06 + rise(bottom) * 0.45 + jitter, 0, 1) };
  }
  if (rise(top) > 0.7 && span > 60) {
    return { archetype: "roof", order: clamp(0.5 + rise(top) * 0.25 + jitter, 0, 1) };
  }
  return { archetype: "frame", order: clamp(0.12 + rise((top + bottom) / 2) * 0.6 + jitter, 0, 1) };
}

/**
 * Where a piece is before it arrives or after it leaves. `bias` leans the scatter toward
 * one side: arrivals come from the side the carousel is travelling from, departures leave
 * the other way.
 */
function scatterPose(piece: Piece, bounds: Bounds, bias: number): Pose {
  const centreX = (bounds.left + bounds.right) / 2;
  const centreY = (bounds.top + bounds.bottom) / 2;
  const depth = random(-1, 1);
  const s = 1 + depth * 0.45;
  // Long members barely turn; small parts tumble.
  const turn = (span: number) => sign() * span * clamp(70 / Math.max(piece.length, 1), 0.25, 1);

  switch (piece.archetype) {
    case "ground": {
      // Beams laid in from the sides.
      const side = piece.cx < centreX ? -1 : 1;
      return { x: side * random(200, 320) + bias * 40, y: random(4, 18), r: random(-3, 3), s: 1, o: 0 };
    }
    case "column":
      // Raised from below, as if hoisted.
      return { x: random(-50, 50) + bias * 60, y: random(150, 240), r: turn(random(6, 16)), s: random(0.9, 1.15), o: 0 };
    case "roof":
      // Lowered from above.
      return { x: random(-70, 70) + bias * 60, y: -random(150, 240), r: turn(random(8, 22)), s: random(0.85, 1.2), o: 0 };
    default: {
      // Everything else gathers from all around, at different depths.
      let dx = piece.cx - centreX;
      let dy = piece.cy - centreY;
      const length = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy / length, dx / length) + random(-0.9, 0.9);
      dx = Math.cos(angle) + bias * 0.45;
      dy = Math.sin(angle);
      const norm = Math.hypot(dx, dy) || 1;
      const distance = random(160, 330) * (1 + depth * 0.3);
      return {
        x: (dx / norm) * distance,
        y: (dy / norm) * distance,
        r: turn(random(25, 85)),
        s,
        o: 0,
      };
    }
  }
}

/**
 * The approach: most of the way in at an easing-out glide, a near stop just short of the
 * mark, then a quick pull into place, like a magnet catching. Velocity is zero on both
 * sides of the join, so the hand-off is smooth.
 */
function magneticEasing(hold: number, reach: number) {
  const samples = 40;
  const points = Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const value =
      t < hold
        ? reach * (1 - Math.pow(1 - t / hold, 4))
        : reach + (1 - reach) * Math.pow((t - hold) / (1 - hold), 3);
    return value.toFixed(4);
  });
  return `linear(${points.join(", ")})`;
}

const supportsLinearEasing =
  typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)");

/** A few variations so pieces don't all settle in step. */
const ARRIVALS = supportsLinearEasing
  ? [magneticEasing(0.78, 0.972), magneticEasing(0.82, 0.98), magneticEasing(0.74, 0.965)]
  : ["cubic-bezier(0.16, 1, 0.3, 1)"];
/** Pieces let go slowly, then pick up speed as they leave. */
const DEPARTURE = "cubic-bezier(0.5, 0, 0.8, 0.45)";

const transformOf = ({ x, y, r, s }: Pose) =>
  `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;

/** Reads the pose a piece is showing right now, mid-flight or at rest. */
function currentPose(piece: Piece): Pose {
  if (!piece.flight) return piece.placed ? AT_REST : { ...AT_REST, o: 0 };
  const style = getComputedStyle(piece.el);
  const match = style.transform.match(/matrix\(([^)]+)\)/);
  const o = Number(style.opacity);
  if (!match) return { ...AT_REST, o };
  const [a = 1, b = 0, , , e = 0, f = 0] = match[1]!.split(",").map(Number);
  return { x: e, y: f, r: (Math.atan2(b, a) * 180) / Math.PI, s: Math.hypot(a, b), o };
}

/**
 * Flies a piece from one pose to another along a gentle curve. The path is sampled into
 * keyframes so it bends, while one timing function covers the whole flight so the speed
 * never jumps between keyframes.
 */
function fly(
  piece: Piece,
  from: Pose,
  to: Pose,
  timing: { duration: number; delay: number; easing: string },
  opacityAt: (u: number) => number,
  onLand: () => void,
) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = random(-0.32, 0.32);
  const controlX = midX - dy * bend;
  const controlY = midY + dx * bend;

  const steps = 10;
  const keyframes: Keyframe[] = Array.from({ length: steps + 1 }, (_, index) => {
    const u = index / steps;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return {
      offset: u,
      transform: transformOf({
        x: a * from.x + b * controlX + c * to.x,
        y: a * from.y + b * controlY + c * to.y,
        r: from.r + (to.r - from.r) * u,
        s: from.s + (to.s - from.s) * u,
        o: 0,
      }),
      opacity: opacityAt(u),
    };
  });

  piece.flight?.cancel();
  const flight = piece.el.animate(keyframes, { ...timing, fill: "both" });
  piece.flight = flight;
  flight.onfinish = () => {
    // The resting style already matches the last frame, so dropping the animation changes nothing on screen.
    if (piece.flight !== flight) return;
    flight.cancel();
    piece.flight = null;
    onLand();
  };
}

/** Sets where a piece rests once its flight is over. */
function rest(piece: Piece, placed: boolean) {
  piece.placed = placed;
  piece.el.style.opacity = placed ? "1" : "0";
}

// ─── A drawing ───────────────────────────────────────────────────────────────

/** How long the build spreads its start times over, in ms. */
const BUILD_SPREAD = 1500;

class Drawing {
  private pieces: Piece[] | null = null;
  private bounds: Bounds = { left: 0, top: 0, right: 0, bottom: 0 };

  private readonly source: SVGGElement;
  private readonly layer: SVGGElement;

  constructor(source: SVGGElement, layer: SVGGElement) {
    this.source = source;
    this.layer = layer;
  }

  /** Splits the drawing the first time it's needed. */
  private ensurePieces() {
    if (this.pieces) return this.pieces;

    const found: {
      node: SVGGeometryElement;
      points: [number, number][];
      strokeWidth: number;
      opacity: number;
    }[] = [];
    for (const shape of this.source.querySelectorAll<SVGGeometryElement>(SHAPES)) {
      const strokeWidth = parseFloat(getComputedStyle(shape).strokeWidth) || 1;
      const opacity = groupOpacity(shape, this.source);
      for (const piece of piecesOf(shape)) found.push({ ...piece, strokeWidth, opacity });
    }

    const all = found.flatMap(({ points }) => points);
    this.bounds = {
      left: Math.min(...all.map(([x]) => x)),
      top: Math.min(...all.map(([, y]) => y)),
      right: Math.max(...all.map(([x]) => x)),
      bottom: Math.max(...all.map(([, y]) => y)),
    };

    // Pieces sharing a stroke and opacity share a group, so faint lines overlap the way the original's do.
    const groups = new Map<string, SVGGElement>();
    const fragment = document.createDocumentFragment();
    this.pieces = found.map(({ node, points, strokeWidth, opacity }) => {
      const key = `${strokeWidth}|${opacity}`;
      let group = groups.get(key);
      if (!group) {
        group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("stroke-width", String(strokeWidth));
        if (opacity !== 1) group.setAttribute("opacity", String(opacity));
        groups.set(key, group);
        fragment.append(group);
      }

      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        length += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
      }

      // Turn and scale around the piece's own centre, in drawing units, so it works at any size.
      node.style.transformBox = "view-box";
      node.style.transformOrigin = `${cx}px ${cy}px`;
      node.style.opacity = "0";
      group.append(node);

      return {
        el: node,
        cx,
        cy,
        length,
        ...classify(points, strokeWidth, this.bounds),
        placed: false,
        flight: null,
      };
    });
    this.layer.append(fragment);
    return this.pieces;
  }

  /** Builds the drawing from wherever its pieces are now. */
  assemble({ delay, bias }: { delay: number; bias: number }) {
    const pieces = this.ensurePieces();
    // Read every pose before changing any, so the browser works out styles once.
    const poses = pieces.map(currentPose);
    this.showOriginal(false);

    pieces.forEach((piece, index) => {
      const from = poses[index]!;
      const midFlight = piece.flight !== null;
      if (!midFlight && piece.placed) return;

      // A piece already on its way back gets a shorter trip than a full build.
      const start = midFlight && from.o > 0.05 ? from : scatterPose(piece, this.bounds, bias);
      const fresh = start !== from;
      const detail = piece.archetype === "detail";
      const duration = fresh
        ? (detail ? random(800, 1050) : random(1050, 1350)) + Math.min(piece.length, 300) * 0.6
        : random(650, 900);
      const startOpacity = start.o;

      rest(piece, true);
      fly(
        piece,
        start,
        AT_REST,
        {
          duration,
          delay: delay + piece.order * (fresh ? BUILD_SPREAD : 450),
          easing: ARRIVALS[index % ARRIVALS.length]!,
        },
        // Far pieces stay faint until they near the plane of the drawing.
        (u) => startOpacity + (1 - startOpacity) * smoothstep(0, fresh ? 0.6 : 0.4, u),
        this.settle,
      );
    });
    this.settle();
  }

  /** Takes the drawing apart, scattering its pieces away from the side `bias` points at. */
  disassemble({ bias, quick = false }: { bias: number; quick?: boolean }) {
    if (!this.pieces) return;
    const pieces = this.pieces;
    const poses = pieces.map(currentPose);
    this.showOriginal(false);

    pieces.forEach((piece, index) => {
      const from = poses[index]!;
      if (!piece.flight && !piece.placed) return;
      if (from.o <= 0.01) {
        piece.flight?.cancel();
        piece.flight = null;
        rest(piece, false);
        return;
      }

      const target = scatterPose(piece, this.bounds, bias);
      // Leave at a shallower distance than the arrival, so the departure doesn't dominate.
      const away: Pose = { ...target, x: target.x * 0.7, y: target.y * 0.7, o: 0 };
      const startOpacity = from.o;

      rest(piece, false);
      fly(
        piece,
        from,
        away,
        {
          duration: quick ? random(220, 320) : random(650, 950),
          // Top and detail first, foundations last: the build in reverse.
          delay: quick ? 0 : (1 - piece.order) * 520,
          easing: DEPARTURE,
        },
        (u) => startOpacity * (1 - smoothstep(0.15, 0.9, u)),
        this.settle,
      );
    });
    this.settle();
  }

  /**
   * Once every piece has landed in place, the original drawing takes over from the copies.
   * They match apart from sub-pixel blending where two copies meet at a corner, so the
   * handover can't be seen, and the finished building is exactly the original drawing.
   */
  private readonly settle = () => {
    const pieces = this.pieces;
    if (!pieces || pieces.some((piece) => piece.flight)) return;
    this.showOriginal(pieces.every((piece) => piece.placed));
  };

  private showOriginal(shown: boolean) {
    this.source.style.visibility = shown ? "visible" : "hidden";
    this.layer.style.visibility = shown ? "hidden" : "";
  }

  destroy() {
    this.pieces?.forEach((piece) => piece.flight?.cancel());
    this.pieces = null;
    this.layer.replaceChildren();
    this.layer.style.visibility = "";
    this.source.style.visibility = "";
  }
}

// ─── The stage ───────────────────────────────────────────────────────────────

/** How long the next building waits for the last one to start coming apart. */
const HANDOVER_DELAY = 450;

/**
 * Coordinates the drawings in one illustration: at most one is building and one is coming
 * apart at a time. Anything older is cleared quickly, so fast clicking never piles up
 * half-built structures. The first build waits until the drawing is on screen.
 */
export class AssemblyStage {
  private readonly drawings = new Map<string, Drawing>();
  private current: string | null = null;
  private leaving: string | null = null;
  private revealed = false;
  private observer: IntersectionObserver | null = null;

  constructor(root: HTMLElement) {
    for (const svg of root.querySelectorAll<SVGSVGElement>("svg[data-property-illustration]")) {
      const source = svg.querySelector<SVGGElement>("[data-drawing-source]");
      const layer = svg.querySelector<SVGGElement>("[data-drawing-layer]");
      if (source && layer) {
        this.drawings.set(svg.dataset.propertyIllustration!, new Drawing(source, layer));
      }
    }

    if (typeof IntersectionObserver === "undefined") {
      this.revealed = true;
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.at(-1)?.isIntersecting) return;
        this.observer?.disconnect();
        this.observer = null;
        this.revealed = true;
        if (this.current) this.drawings.get(this.current)?.assemble({ delay: 120, bias: 0 });
      },
      { threshold: 0.35 },
    );
    this.observer.observe(root);
  }

  /** Switches to `type`, building it as the previous one comes apart. `direction` is 1 forward, -1 back. */
  show(type: string, direction: number) {
    if (type === this.current) return;
    const previous = this.current;
    this.current = type;
    if (!this.revealed) return;

    if (this.leaving && this.leaving !== type && this.leaving !== previous) {
      this.drawings.get(this.leaving)?.disassemble({ bias: -direction, quick: true });
    }
    this.leaving = previous;
    if (previous) this.drawings.get(previous)?.disassemble({ bias: -direction });
    this.drawings.get(type)?.assemble({ delay: previous ? HANDOVER_DELAY : 0, bias: direction });
  }

  destroy() {
    this.observer?.disconnect();
    for (const drawing of this.drawings.values()) drawing.destroy();
    this.drawings.clear();
  }
}
