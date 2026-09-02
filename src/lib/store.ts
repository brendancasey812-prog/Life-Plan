"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MONTHS, childHue, makeBubble, newId, seedTrees } from "./seed";
import type { Bubble, PlanState, Settings, Tree, TreeId, WeekEntry } from "./types";
import { weekKey } from "./weeks";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  birthDate: "2001-01-01",
  lifespan: 100,
};

interface Actions {
  /** Fills in a timeline bubble's children the first time it is opened. */
  openBubble: (tree: TreeId, id: string) => void;
  addBubble: (tree: TreeId, parentId: string, label: string) => string | null;
  renameBubble: (tree: TreeId, id: string, label: string) => void;
  deleteBubble: (tree: TreeId, id: string) => void;
  setNote: (tree: TreeId, id: string, note: string) => void;
  setWeek: (age: number, week: number, patch: Partial<WeekEntry>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: PlanState) => void;
  resetAll: () => void;
}

export type PlanStore = PlanState & Actions;

function emptyState(): PlanState {
  return { settings: { ...DEFAULT_SETTINGS }, trees: seedTrees(), weeks: {} };
}

/** The children a `generate` bubble should be filled with. */
function generatedChildren(node: Bubble, lifespan: number): Bubble[] {
  if (node.generate === "decades") {
    const decades: Bubble[] = [];
    for (let start = 0; start <= lifespan - 1; start += 10) {
      // Roll the leftover years into the final decade rather than stranding
      // a one-bubble "100 – 100" row.
      const end = start + 19 > lifespan ? lifespan : start + 9;
      decades.push(
        makeBubble({
          label: `${start} – ${end}`,
          parentId: node.id,
          hue: childHue(node.hue, decades.length, Math.ceil(lifespan / 10)),
          generate: "years",
          ageFrom: start,
          ageTo: end,
        }),
      );
      if (end === lifespan) break;
    }
    return decades;
  }

  if (node.generate === "years") {
    const from = node.ageFrom ?? 0;
    const to = node.ageTo ?? from;
    const count = to - from + 1;
    return Array.from({ length: count }, (_, i) =>
      makeBubble({
        label: `Age ${from + i}`,
        parentId: node.id,
        hue: childHue(node.hue, i, count),
        generate: "months",
        ageFrom: from + i,
        ageTo: from + i,
      }),
    );
  }

  if (node.generate === "months") {
    return MONTHS.map((name, i) =>
      makeBubble({
        label: name,
        parentId: node.id,
        hue: childHue(node.hue, i, MONTHS.length),
        ageFrom: node.ageFrom,
        ageTo: node.ageTo,
        month: i,
      }),
    );
  }

  return [];
}

/** Every id in the subtree rooted at `id`, including `id` itself. */
function subtreeIds(tree: Tree, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    const node = tree.nodes[cur];
    if (!node) continue;
    out.push(cur);
    stack.push(...node.childIds);
  }
  return out;
}

/** Rewrites one tree; every mutation goes through here so updates stay pure. */
function withTree(state: PlanState, treeId: TreeId, next: Tree): Pick<PlanState, "trees"> {
  return { trees: { ...state.trees, [treeId]: next } };
}

export const usePlan = create<PlanStore>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      openBubble: (treeId, id) => {
        const tree = get().trees[treeId];
        const node = tree?.nodes[id];
        if (!node || node.seeded || !node.generate) return;

        const kids = generatedChildren(node, get().settings.lifespan);
        const nodes: Record<string, Bubble> = { ...tree.nodes };
        for (const kid of kids) nodes[kid.id] = kid;
        nodes[id] = { ...node, seeded: true, childIds: kids.map((k) => k.id) };
        set((s) => withTree(s, treeId, { ...tree, nodes }));
      },

      addBubble: (treeId, parentId, label) => {
        const trimmed = label.trim();
        const tree = get().trees[treeId];
        const parent = tree?.nodes[parentId];
        if (!trimmed || !parent) return null;

        const index = parent.childIds.length;
        const kid = makeBubble({
          id: newId(),
          label: trimmed,
          parentId,
          // Offset by a non-multiple of the wheel so siblings stay distinct
          // however many get added later.
          hue: Math.round((parent.hue + 40 + index * 47) % 360),
          seeded: true,
        });
        set((s) =>
          withTree(s, treeId, {
            ...tree,
            nodes: {
              ...tree.nodes,
              [kid.id]: kid,
              [parentId]: { ...parent, childIds: [...parent.childIds, kid.id] },
            },
          }),
        );
        return kid.id;
      },

      renameBubble: (treeId, id, label) => {
        const trimmed = label.trim();
        const tree = get().trees[treeId];
        const node = tree?.nodes[id];
        if (!trimmed || !node) return;
        set((s) =>
          withTree(s, treeId, {
            ...tree,
            nodes: { ...tree.nodes, [id]: { ...node, label: trimmed } },
          }),
        );
      },

      deleteBubble: (treeId, id) => {
        const tree = get().trees[treeId];
        const node = tree?.nodes[id];
        // The root is the tab itself — there is nothing to show without it.
        if (!node || !node.parentId) return;
        const parent = tree.nodes[node.parentId];
        if (!parent) return;

        const nodes = { ...tree.nodes };
        for (const dead of subtreeIds(tree, id)) delete nodes[dead];
        nodes[parent.id] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) };
        set((s) => withTree(s, treeId, { ...tree, nodes }));
      },

      setNote: (treeId, id, note) => {
        const tree = get().trees[treeId];
        const node = tree?.nodes[id];
        if (!node) return;
        set((s) =>
          withTree(s, treeId, { ...tree, nodes: { ...tree.nodes, [id]: { ...node, note } } }),
        );
      },

      setWeek: (age, week, patch) => {
        const key = weekKey(age, week);
        set((s) => {
          const base: WeekEntry = s.weeks[key] ?? { note: "", done: false };
          const entry: WeekEntry = { ...base, ...patch };
          const weeks = { ...s.weeks };
          // Drop empty cells so the grid stays cheap to store and scan.
          if (!entry.note.trim() && !entry.done) delete weeks[key];
          else weeks[key] = entry;
          return { weeks };
        });
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (next) => set({ ...next }),

      resetAll: () => set(emptyState()),
    }),
    {
      name: "life-plan-v1",
      partialize: (s): PlanState => ({ settings: s.settings, trees: s.trees, weeks: s.weeks }),
    },
  ),
);

export function exportPlan(state: PlanState): string {
  return JSON.stringify(
    { settings: state.settings, trees: state.trees, weeks: state.weeks },
    null,
    2,
  );
}

/** Parses an exported plan, returning null rather than throwing on junk. */
export function parsePlan(text: string): PlanState | null {
  try {
    const data = JSON.parse(text) as Partial<PlanState>;
    if (!data.trees?.life?.rootId || !data.trees?.map?.rootId) return null;
    return {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      trees: data.trees,
      weeks: data.weeks ?? {},
    };
  } catch {
    return null;
  }
}
