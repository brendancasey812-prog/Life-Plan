import type { Blueprint, BlueprintPart } from "./types";
import { newId } from "./seed";

/** The grid page behind a bubble, keyed the way its writing page is. */
export const blueprintKey = (noteKey: string) => noteKey;

/** Materials the legend knows a colour for; anything else gets the last one. */
export const MATERIALS: { name: string; fill: string; stroke: string }[] = [
  { name: "Glass", fill: "hsl(195 42% 62% / 0.3)", stroke: "hsl(195 45% 45%)" },
  { name: "White oak", fill: "hsl(36 38% 62% / 0.55)", stroke: "hsl(32 35% 38%)" },
  { name: "Walnut", fill: "hsl(24 30% 42% / 0.6)", stroke: "hsl(22 30% 26%)" },
  { name: "Steel", fill: "hsl(212 12% 60% / 0.5)", stroke: "hsl(212 14% 35%)" },
  { name: "Other", fill: "hsl(160 20% 55% / 0.45)", stroke: "hsl(160 24% 32%)" },
];

export function materialOf(name: string) {
  return MATERIALS.find((m) => m.name.toLowerCase() === name.trim().toLowerCase()) ?? MATERIALS[4];
}

export function makePart(part: Partial<BlueprintPart> = {}): BlueprintPart {
  return {
    id: newId("pt"),
    label: part.label ?? "Part",
    material: part.material ?? "White oak",
    x: part.x ?? 0,
    y: part.y ?? 0,
    w: part.w ?? 4,
    h: part.h ?? 4,
    thickness: part.thickness,
    notes: part.notes,
  };
}

/** An empty sheet: a yard square, an inch to a grid line. */
export function emptyBlueprint(title: string): Blueprint {
  return {
    title,
    unit: "in",
    grid: 2,
    width: 60,
    height: 40,
    parts: [],
    notes: "",
    updatedAt: Date.now(),
  };
}

/**
 * A table to start from rather than an empty sheet: a glass top over a frame
 * of four legs and four rails. Every figure is the user's to change — it is
 * here so the page opens as a drawing rather than as graph paper.
 */
export function starterTable(title: string): Blueprint {
  const W = 48;
  const D = 24;
  // The sheet is bigger than the table, so the table sits in the middle of it
  // rather than in the corner.
  const ox = 3;
  const oy = 3;
  const leg = 2;
  const rail = 1.5;
  const parts: BlueprintPart[] = [
    makePart({ label: "Glass top", material: "Glass", x: ox, y: oy, w: W, h: D, thickness: 0.5 }),
    makePart({
      label: "Leg — front left",
      material: "White oak",
      x: ox + 1,
      y: oy + 1,
      w: leg,
      h: leg,
      thickness: 28,
    }),
    makePart({
      label: "Leg — front right",
      material: "White oak",
      x: ox + W - leg - 1,
      y: oy + 1,
      w: leg,
      h: leg,
      thickness: 28,
    }),
    makePart({
      label: "Leg — back left",
      material: "White oak",
      x: ox + 1,
      y: oy + D - leg - 1,
      w: leg,
      h: leg,
      thickness: 28,
    }),
    makePart({
      label: "Leg — back right",
      material: "White oak",
      x: ox + W - leg - 1,
      y: oy + D - leg - 1,
      w: leg,
      h: leg,
      thickness: 28,
    }),
    makePart({
      label: "Rail — front",
      material: "White oak",
      x: ox + 1 + leg,
      y: oy + 1,
      w: W - 2 * leg - 2,
      h: rail,
      thickness: 3.5,
    }),
    makePart({
      label: "Rail — back",
      material: "White oak",
      x: ox + 1 + leg,
      y: oy + D - 1 - rail,
      w: W - 2 * leg - 2,
      h: rail,
      thickness: 3.5,
    }),
    makePart({
      label: "Rail — left",
      material: "White oak",
      x: ox + 1,
      y: oy + 1 + leg,
      w: rail,
      h: D - 2 * leg - 2,
      thickness: 3.5,
    }),
    makePart({
      label: "Rail — right",
      material: "White oak",
      x: ox + W - 1 - rail,
      y: oy + 1 + leg,
      w: rail,
      h: D - 2 * leg - 2,
      thickness: 3.5,
    }),
  ];
  return { ...emptyBlueprint(title), width: 54, height: 30, parts };
}

/** What the legend lists: each material, what is made of it, and how much. */
export function legendOf(bp: Blueprint) {
  const groups = new Map<string, BlueprintPart[]>();
  for (const part of bp.parts) {
    const key = part.material.trim() || "Other";
    groups.set(key, [...(groups.get(key) ?? []), part]);
  }
  return [...groups.entries()].map(([material, parts]) => ({
    material,
    parts,
    colour: materialOf(material),
  }));
}

/** Rounds to the nearest grid line, which is what makes a drawing line up. */
export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

/** Trims a number to two decimals without trailing zeroes. */
export function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}
