import type { CSSProperties } from "react";

/**
 * The same lightness reads very differently by hue — a yellow at 56% is far
 * brighter than a blue at 56%, and the labels are white. This pulls the warm
 * half of the wheel down so every planet carries its text, and leaves the
 * cool half alone.
 */
export function hueDrop(hue: number): number {
  const warm = Math.max(0, Math.cos(((hue - 70) * Math.PI) / 180));
  return +(warm * 16).toFixed(1);
}

/** FNV-1a. Small, stable, and enough to give each planet a fixed face. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable 0–1 draw from a seed, varied by `salt`. */
function draw(seed: string, salt: number): number {
  return (hash(`${seed}:${salt}`) % 10000) / 10000;
}

type Surface = "bands" | "mottle" | "swirl" | "craters" | "clear";

const SURFACES: Surface[] = ["bands", "mottle", "swirl", "craters", "bands", "mottle", "clear"];

export interface Traits {
  surface: Surface;
  /** Degrees the banding or swirl is tilted by. */
  tilt: number;
  /** Where the light falls, as percentages across the disc. */
  lightX: number;
  lightY: number;
}

/** Every planet's face comes from its id, so it keeps it for good. */
export function traitsOf(seed: string): Traits {
  return {
    surface: SURFACES[hash(seed) % SURFACES.length],
    tilt: Math.round(-35 + draw(seed, 1) * 70),
    lightX: Math.round(24 + draw(seed, 2) * 12),
    lightY: Math.round(19 + draw(seed, 3) * 12),
  };
}

/** The texture layers that sit between the sphere and its shading. */
function surfaceLayers(seed: string, t: Traits): string[] {
  switch (t.surface) {
    case "bands":
      // Wide and faint: atmospheric belts, not stripes.
      return [
        `repeating-linear-gradient(${t.tilt + 90}deg, rgb(255 255 255 / 0.032) 0 9%, rgb(0 0 0 / 0.028) 9% 20%)`,
        `linear-gradient(${t.tilt + 90}deg, transparent 30%, rgb(255 255 255 / 0.055) 40%, transparent 50%)`,
        `linear-gradient(${t.tilt + 90}deg, transparent 60%, rgb(0 0 0 / 0.06) 71%, transparent 82%)`,
      ];
    case "mottle":
      return [0, 1, 2, 3].map((i) => {
        const x = Math.round(22 + draw(seed, 10 + i) * 58);
        const y = Math.round(22 + draw(seed, 20 + i) * 58);
        const w = (16 + draw(seed, 30 + i) * 22).toFixed(0);
        const tone = i % 2 ? "rgb(255 255 255 / 0.075)" : "rgb(0 0 0 / 0.11)";
        return `radial-gradient(ellipse ${w}% ${(Number(w) * 0.68).toFixed(0)}% at ${x}% ${y}%, ${tone}, transparent 72%)`;
      });
    case "swirl":
      return [
        `conic-gradient(from ${t.tilt + 180}deg at 44% 40%, rgb(255 255 255 / 0.075), transparent 22%, rgb(0 0 0 / 0.1) 52%, transparent 74%, rgb(255 255 255 / 0.05))`,
        `radial-gradient(ellipse 62% 40% at 52% 58%, rgb(0 0 0 / 0.1), transparent 70%)`,
      ];
    case "craters":
      // Small and low-contrast, so they read as pitting rather than spots.
      return [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const x = Math.round(22 + draw(seed, 40 + i) * 58);
        const y = Math.round(22 + draw(seed, 50 + i) * 58);
        const r = (1.1 + draw(seed, 60 + i) * 2.2).toFixed(1);
        const rim = (Number(r) * 1.5).toFixed(1);
        return (
          `radial-gradient(circle at ${x}% ${y}%, rgb(0 0 0 / 0.13) 0 ${r}%, ` +
          `rgb(255 255 255 / 0.07) ${r}% ${rim}%, transparent ${rim}%)`
        );
      });
    case "clear":
      return [];
  }
}

/**
 * A planet rather than a flat disc: a lit sphere with a specular highlight,
 * a terminator falling away to a dark limb, an atmospheric rim on the lit
 * edge, and a surface of its own. All of it still comes from the palette's
 * hue, saturation and lightness variables, so the colour scheme is unchanged
 * and both themes are handled where they always were.
 *
 * `radius` is needed because the shading is drawn with shadows, whose sizes
 * are in pixels and so have to scale with the planet.
 */
export function planetStyle(hue: number, radius: number, seed: string, dim = false): CSSProperties {
  const v = dim ? "dim" : "on";
  const d = hueDrop(hue);
  const t = traitsOf(seed);
  /** Lightness from the palette, pulled down for warm hues and by `extra`. */
  const l = (n: 1 | 2, extra = 0) => `calc(var(--b-${v}-l${n}) - ${(d + extra).toFixed(1)}%)`;
  const a = `var(--b-${v}-a)`;
  const r = Math.max(12, radius);

  const layers = [
    // Specular highlight, where the light hits.
    `radial-gradient(circle at ${t.lightX}% ${t.lightY}%, rgb(255 255 255 / 0.26), rgb(255 255 255 / 0.13) 12%, rgb(255 255 255 / 0.04) 30%, rgb(255 255 255 / 0) 52%)`,
    // Terminator: the curve away from the light, into a dark limb.
    `radial-gradient(circle at ${t.lightX + 6}% ${t.lightY + 5}%, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.2) 62%, rgb(0 0 0 / 0.46) 86%, rgb(0 0 0 / 0.6) 100%)`,
    ...surfaceLayers(seed, t),
    // The sphere itself.
    `radial-gradient(circle at ${t.lightX + 4}% ${t.lightY + 2}%, hsl(${hue} var(--b-${v}-s) ${l(1, -6)} / ${a}), hsl(${hue} var(--b-${v}-s) ${l(1)} / ${a}) 26%, hsl(${hue} var(--b-${v}-s2) ${l(2)} / ${a}) 72%, hsl(${hue} var(--b-${v}-s2) ${l(2, 12)} / ${a}) 100%)`,
  ];

  return {
    background: layers.join(", "),
    boxShadow: [
      // A hairline so the planet has an edge against the page.
      `0 0 0 1px hsl(${hue} 40% var(--b-ring-l) / var(--b-ring-a))`,
      // Atmosphere catching the light on the near limb.
      `inset ${(r * 0.09).toFixed(1)}px ${(r * 0.11).toFixed(1)}px ${(r * 0.24).toFixed(1)}px ${(-r * 0.13).toFixed(1)}px rgb(255 255 255 / 0.3)`,
      // The far limb falling into shadow.
      `inset ${(-r * 0.13).toFixed(1)}px ${(-r * 0.17).toFixed(1)}px ${(r * 0.34).toFixed(1)}px ${(-r * 0.15).toFixed(1)}px rgb(0 0 0 / 0.5)`,
      // Cast shadow, so it sits above the page rather than on it.
      `0 ${(r * 0.2).toFixed(1)}px ${(r * 0.44).toFixed(1)}px ${(-r * 0.22).toFixed(1)}px rgb(0 0 0 / var(--b-shadow-a))`,
    ].join(", "),
  };
}
