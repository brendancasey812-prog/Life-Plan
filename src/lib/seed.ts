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

/** Spread children evenly around the colour wheel, anchored on the parent. */
export function childHue(parentHue: number, index: number, count: number): number {
  const spread = count <= 1 ? 0 : 300 * (index / count);
  return Math.round((parentHue + 30 + spread) % 360);
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
  const root = makeBubble({ id: "map_root", label: "Life Categories", hue: 275, seeded: true });
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

export function seedTrees(): Record<TreeId, Tree> {
  return { life: seedLifeTree(), map: seedMapTree() };
}
