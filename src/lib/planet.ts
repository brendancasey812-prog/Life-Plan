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

/** Where the light falls, the same for every planet, as one sun would. */
const LIGHT_X = 30;
const LIGHT_Y = 24;

/**
 * A lit sphere: a diffuse highlight where the light falls, a terminator
 * curving away into a dark limb, atmosphere catching the light on the near
 * edge, and a cast shadow so it sits above the page rather than on it. No
 * surface markings — the colour carries it.
 *
 * Hue, saturation and lightness all come from the palette variables, so the
 * colour scheme is untouched and both themes are handled where they always
 * were. `radius` is needed because the shading is drawn with shadows, whose
 * sizes are in pixels and so have to scale with the planet.
 */
export function planetStyle(hue: number, radius: number, dim = false): CSSProperties {
  const v = dim ? "dim" : "on";
  const d = hueDrop(hue);
  /** Lightness from the palette, pulled down for warm hues and by `extra`. */
  const l = (n: 1 | 2, extra = 0) => `calc(var(--b-${v}-l${n}) - ${(d + extra).toFixed(1)}%)`;
  const a = `var(--b-${v}-a)`;
  const r = Math.max(12, radius);

  return {
    background: [
      `radial-gradient(circle at ${LIGHT_X}% ${LIGHT_Y}%, rgb(255 255 255 / 0.24), rgb(255 255 255 / 0.11) 13%, rgb(255 255 255 / 0.03) 32%, rgb(255 255 255 / 0) 54%)`,
      `radial-gradient(circle at ${LIGHT_X + 6}% ${LIGHT_Y + 5}%, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.2) 62%, rgb(0 0 0 / 0.46) 86%, rgb(0 0 0 / 0.6) 100%)`,
      `radial-gradient(circle at ${LIGHT_X + 4}% ${LIGHT_Y + 2}%, hsl(${hue} var(--b-${v}-s) ${l(1, -6)} / ${a}), hsl(${hue} var(--b-${v}-s) ${l(1)} / ${a}) 26%, hsl(${hue} var(--b-${v}-s2) ${l(2)} / ${a}) 72%, hsl(${hue} var(--b-${v}-s2) ${l(2, 12)} / ${a}) 100%)`,
    ].join(", "),
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
