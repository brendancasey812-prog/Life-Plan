export interface Placed {
  /** Centre, in pixels, relative to the canvas box. */
  x: number;
  y: number;
  /** Radius in pixels. Every bubble in a layout shares one radius. */
  r: number;
}

/** How many bubbles one ring holds before a second ring is worth opening. */
const FIRST_RING = 14;
const MAX_RINGS = 4;

/** Ring sizes, as fractions of the canvas half-width and half-height. */
const SOLO_RING = 0.62;
const INNER_RING = 0.4;
const OUTER_RING = 0.82;

/** Centre-bubble and bubble-size limits, against the canvas's short side. */
const CENTRE = 0.19;
const SOLO_CENTRE = 0.46;
const MAX_BUBBLE = 0.3;
const MIN_BUBBLE = 0.045;

const PAD = 12;

function halfBox(width: number, height: number) {
  return {
    x: Math.max(40, width / 2 - PAD),
    y: Math.max(40, height / 2 - PAD),
  };
}

/** Radius of the bubble sitting at the centre of the canvas. */
export function centreRadius(width: number, height: number, hasRing: boolean): number {
  const half = halfBox(width, height);
  return Math.min(half.x, half.y) * (hasRing ? CENTRE : SOLO_CENTRE);
}

/** Splits `n` bubbles across rings, giving outer rings proportionally more. */
function ringCounts(n: number): number[] {
  const rings = Math.min(MAX_RINGS, Math.max(1, Math.ceil(n / FIRST_RING)));
  if (rings === 1) return [n];

  // Ring j (0-indexed) has room proportional to j + 1.
  const weight = (rings * (rings + 1)) / 2;
  const counts = Array.from({ length: rings }, (_, j) =>
    Math.max(1, Math.floor((n * (j + 1)) / weight)),
  );
  // Hand any rounding remainder to the outermost ring, which has the most room.
  counts[rings - 1] += n - counts.reduce((a, b) => a + b, 0);
  return counts;
}

const STEPS = 1440;

/**
 * `n` points spread evenly *by arc length* around an ellipse, starting at the
 * top. Equal angles would bunch the bubbles up at the ends of a wide canvas;
 * equal arc length keeps neighbours the same distance apart the whole way
 * round, which is what sets how big every bubble can be.
 */
function ellipsePoints(
  n: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  phase: number,
): { x: number; y: number }[] {
  const angleAt = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / STEPS;
  const cum = new Float64Array(STEPS + 1);
  let px = cx + rx * Math.cos(angleAt(0));
  let py = cy + ry * Math.sin(angleAt(0));
  for (let i = 1; i <= STEPS; i++) {
    const x = cx + rx * Math.cos(angleAt(i));
    const y = cy + ry * Math.sin(angleAt(i));
    cum[i] = cum[i - 1] + Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }

  const total = cum[STEPS];
  return Array.from({ length: n }, (_, i) => {
    const target = (((i + phase) / n) * total) % total;
    let lo = 0;
    let hi = STEPS;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const a = angleAt(lo);
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

/**
 * Lays `count` bubbles out in rings that fill the box. The bubble radius is
 * whatever the tightest neighbour, centre-bubble and edge clearance allows, so
 * adding a bubble, deleting one or resizing the window re-solves the whole
 * arrangement rather than letting anything overlap or spill.
 */
export function ringLayout(
  count: number,
  width: number,
  height: number,
  /** False when nothing sits in the middle, so the ring can use it. */
  reserveCentre = true,
): Placed[] {
  if (count <= 0 || width <= 0 || height <= 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const half = halfBox(width, height);
  const short = Math.min(half.x, half.y);
  const counts = ringCounts(count);
  const rings = counts.length;

  const points = counts.flatMap((n, j) => {
    const f = rings === 1 ? SOLO_RING : INNER_RING + (OUTER_RING - INNER_RING) * (j / (rings - 1));
    // Stagger alternate rings by half a step so they interlock.
    return ellipsePoints(n, cx, cy, half.x * f, half.y * f, j % 2 ? 0.5 : 0);
  });

  const cR = reserveCentre ? short * CENTRE : 0;
  let r = short * MAX_BUBBLE;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    r = Math.min(
      r,
      (Math.hypot(p.x - cx, p.y - cy) - cR) * 0.92, // the centre bubble
      Math.min(p.x, width - p.x, p.y, height - p.y) * 0.95, // the canvas edge
    );
    for (let k = i + 1; k < points.length; k++) {
      r = Math.min(r, (Math.hypot(p.x - points[k].x, p.y - points[k].y) / 2) * 0.92);
    }
  }

  const radius = Math.max(r, short * MIN_BUBBLE);
  return points.map((p) => ({ x: p.x, y: p.y, r: radius }));
}
