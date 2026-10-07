import type { Bubble, Tree, TreeId } from "./types";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Stable-ish unique id. Bubbles are only ever created in the browser. */
export function newId(prefix = "b"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function makeBubble(b: Partial<Bubble> & { label: string }): Bubble {
  return {
    id: b.id ?? newId(),
    label: b.label,
    parentId: b.parentId ?? null,
    childIds: b.childIds ?? [],
    hue: b.hue ?? 210,
    seeded: b.seeded,
    generate: b.generate,
    ageFrom: b.ageFrom,
    ageTo: b.ageTo,
    month: b.month,
  };
}

/**
 * The band the plan is coloured from: green through teal into blue. Every hue
 * in the app walks this rather than the whole wheel, so a board of a dozen
 * tiles reads as one set of colours instead of a rainbow.
 */
export const HUE_FROM = 148;
export const HUE_TO = 244;
const HUE_SPAN = HUE_TO - HUE_FROM;

/** Wraps any offset back into the band. */
function inBand(offset: number): number {
  return Math.round(HUE_FROM + (((offset % HUE_SPAN) + HUE_SPAN) % HUE_SPAN));
}

/** Spread children evenly along the band, anchored on the parent. */
export function childHue(parentHue: number, index: number, count: number): number {
  const step = count <= 1 ? 0 : HUE_SPAN * (index / count);
  return inBand(parentHue - HUE_FROM + 26 + step);
}

/** The next colour along for a bubble the user adds themselves. */
export function nextHue(parentHue: number, index: number): number {
  // A step that does not divide the band, so siblings stay distinct however
  // many are added later.
  return inBand(parentHue - HUE_FROM + 37 + index * 43);
}

/** Tab 1: a single "Life Plan" planet; decades, years and months grow from it. */
export function seedLifeTree(): Tree {
  const root = makeBubble({
    id: "life_root",
    label: "Life Plan",
    hue: 205,
    generate: "decades",
    ageFrom: 0,
  });
  return { rootId: root.id, nodes: { [root.id]: root } };
}

/** Tab 3: the categories the plan is built around, spelled out up front. */
const MAP: [string, string[]][] = [
  ["Personal Health", ["Mental Health", "Physical Health", "Sexual Health"]],
  ["Outdoors", ["Camping and Hiking", "Biking", "Eco Footprint"]],
  ["Music", []],
  ["Finance", []],
  ["Craftmanship", []],
];

export function seedMapTree(): Tree {
  const root = makeBubble({ id: "map_root", label: "Life Categories", hue: 168, seeded: true });
  const nodes: Record<string, Bubble> = { [root.id]: root };

  MAP.forEach(([area, subs], i) => {
    const areaNode = makeBubble({
      label: area,
      parentId: root.id,
      hue: childHue(root.hue, i, MAP.length),
      seeded: true,
    });
    nodes[areaNode.id] = areaNode;
    root.childIds.push(areaNode.id);

    subs.forEach((sub, j) => {
      const subNode = makeBubble({
        label: sub,
        parentId: areaNode.id,
        hue: childHue(areaNode.hue, j, subs.length),
        seeded: true,
      });
      nodes[subNode.id] = subNode;
      areaNode.childIds.push(subNode.id);
    });
  });

  return { rootId: root.id, nodes };
}

/**
 * Tab 4: the rooms and the things being made for them. It starts with the one
 * it was built for and is a board like any other, so another room is a tile
 * away.
 */
export function seedRoomTree(): Tree {
  const root = makeBubble({ id: "rooms_root", label: "Marin Room", hue: 186, seeded: true });
  const table = makeBubble({
    label: "Glass Table — Wood Frame",
    parentId: root.id,
    hue: childHue(root.hue, 0, 2),
    seeded: true,
  });
  root.childIds.push(table.id);
  return { rootId: root.id, nodes: { [root.id]: root, [table.id]: table } };
}

export function seedTrees(): Record<TreeId, Tree> {
  return { life: seedLifeTree(), map: seedMapTree(), rooms: seedRoomTree() };
}
