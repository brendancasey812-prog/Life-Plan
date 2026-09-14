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

/**
 * A flat, clearly outlined disc rather than a modelled sphere. The heavy
 * version — strong terminator, dark limb, inset shading either side, a big
 * cast shadow — made a ring of a dozen of them tiring to look at, so this
 * keeps only a soft sheen for a little life and spends the contrast on the
 * edge instead.
 *
 * Hue, saturation and lightness all come from the palette variables, so the
 * colour scheme is untouched and both themes are handled where they always
 * were. `radius` is needed because the border and the lift are drawn in
 * pixels and so have to scale with the bubble.
 */
export function planetStyle(hue: number, radius: number, dim = false): CSSProperties {
  const v = dim ? "dim" : "on";
  const d = hueDrop(hue);
  /** Lightness from the palette, pulled down for warm hues and by `extra`. */
  const l = (n: 1 | 2, extra = 0) => `calc(var(--b-${v}-l${n}) - ${(d + extra).toFixed(1)}%)`;
  const a = `var(--b-${v}-a)`;
  const r = Math.max(12, radius);
  // Inset, so the border never widens the bubble's footprint and the layout
  // solver's spacing still holds.
  const border = Math.max(1.5, r * 0.04).toFixed(1);
  // Measured against this bubble's own fill rather than a fixed lightness, so
  // a dark bubble gets as much edge as a pale one: darker in light, lighter in
  // dark, by the same amount either way.
  const edge = `calc(${l(2)} - 17% + var(--dk) * 40%)`;

  return {
    background: [
      `radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.13), rgb(255 255 255 / 0) 60%)`,
      `linear-gradient(155deg, hsl(${hue} var(--b-${v}-s) ${l(1)} / ${a}), hsl(${hue} var(--b-${v}-s2) ${l(2)} / ${a}))`,
    ].join(", "),
    boxShadow: [
      `inset 0 0 0 ${border}px hsl(${hue} 42% ${edge} / var(--b-ring-a))`,
      `0 ${(r * 0.05).toFixed(1)}px ${(r * 0.13).toFixed(1)}px ${(-r * 0.09).toFixed(1)}px rgb(0 0 0 / var(--b-shadow-a))`,
    ].join(", "),
  };
}
