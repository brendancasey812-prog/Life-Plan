"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bubbleNoteKey, excerptOf, weekNoteKey, writeNote } from "./notes";
import { MONTHS, childHue, makeBubble, newId, seedTrees } from "./seed";
import type { Bubble, NoteMeta, Page, PlanState, Settings, Tree, TreeId, WeekEntry } from "./types";
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
  /** Deletes the bubble and its descendants, returning their note keys. */
  deleteBubble: (tree: TreeId, id: string) => string[];
  setWeekDone: (age: number, week: number, done: boolean) => void;
  addPage: (title: string) => string;
  renamePage: (id: string, title: string) => void;
  deletePage: (id: string) => void;
  /** Records what a note page holds; null once the page is empty or gone. */
  setNoteMeta: (key: string, meta: NoteMeta | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: PlanState) => void;
  resetAll: () => void;
}

export type PlanStore = PlanState & Actions;

function emptyState(): PlanState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    trees: seedTrees(),
    weeks: {},
    pages: [],
    notes: {},
  };
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

function withoutKeys(notes: Record<string, NoteMeta>, keys: string[]): Record<string, NoteMeta> {
  const next = { ...notes };
  for (const key of keys) delete next[key];
  return next;
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
        if (!node || !node.parentId) return [];
        const parent = tree.nodes[node.parentId];
        if (!parent) return [];

        const dead = subtreeIds(tree, id);
        const nodes = { ...tree.nodes };
        for (const gone of dead) delete nodes[gone];
        nodes[parent.id] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) };

        const noteKeys = dead.map((d) => bubbleNoteKey(treeId, d));
        set((s) => ({
          ...withTree(s, treeId, { ...tree, nodes }),
          notes: withoutKeys(s.notes, noteKeys),
        }));
        return noteKeys;
      },

      setWeekDone: (age, week, done) => {
        const key = weekKey(age, week);
        set((s) => {
          const weeks = { ...s.weeks };
          // Only store the cells that say something.
          if (done) weeks[key] = { done: true };
          else delete weeks[key];
          return { weeks };
        });
      },

      addPage: (title) => {
        const page: Page = { id: newId("p"), title, createdAt: Date.now() };
        set((s) => ({ pages: [page, ...s.pages] }));
        return page.id;
      },

      // Kept exactly as typed, empty included, so backspacing a title works;
      // `pageTitle` supplies the fallback wherever one is shown.
      renamePage: (id, title) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)) })),

      deletePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id),
          notes: withoutKeys(s.notes, [`page:${id}`]),
        })),

      setNoteMeta: (key, meta) =>
        set((s) =>
          meta ? { notes: { ...s.notes, [key]: meta } } : { notes: withoutKeys(s.notes, [key]) },
        ),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (next) => set({ ...next }),

      resetAll: () => set(emptyState()),
    }),
    {
      name: "life-plan-v1",
      version: 2,
      partialize: (s): PlanState => ({
        settings: s.settings,
        trees: s.trees,
        weeks: s.weeks,
        pages: s.pages,
        notes: s.notes,
      }),
      migrate: async (persisted, version) => {
        const state = persisted as PlanState;
        if (version >= 2) return state;

        // v1 kept one plain-text note per bubble and per week cell. Lift each
        // into a note page so nothing written before the editor existed is
        // lost.
        const notes: Record<string, NoteMeta> = {};
        const writes: Promise<unknown>[] = [];
        const carry = (key: string, text: string) => {
          if (!text.trim()) return;
          notes[key] = { excerpt: excerptOf(text), images: 0, updatedAt: Date.now() };
          const html = text
            .split(/\n{2,}/)
            .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
            .join("");
          writes.push(writeNote(key, { html, text, images: 0, updatedAt: Date.now() }));
        };

        for (const treeId of ["life", "map"] as TreeId[]) {
          const nodes = state.trees?.[treeId]?.nodes ?? {};
          for (const node of Object.values(nodes)) {
            carry(bubbleNoteKey(treeId, node.id), (node as Bubble & { note?: string }).note ?? "");
            delete (node as Bubble & { note?: string }).note;
          }
        }
        const weeks: Record<string, WeekEntry> = {};
        for (const [key, entry] of Object.entries(state.weeks ?? {})) {
          const legacy = entry as WeekEntry & { note?: string };
          const [age, week] = key.split(":");
          carry(weekNoteKey(Number(age), Number(week)), legacy.note ?? "");
          if (legacy.done) weeks[key] = { done: true };
        }

        await Promise.allSettled(writes);
        return { ...state, weeks, pages: state.pages ?? [], notes };
      },
    },
  ),
);

export function pageTitle(title: string): string {
  return title.trim() || "Untitled page";
}

/** Parses an exported plan, returning null rather than throwing on junk. */
export function parsePlan(text: string): (PlanState & { noteBodies?: unknown }) | null {
  try {
    const data = JSON.parse(text) as Partial<PlanState> & { noteBodies?: unknown };
    if (!data.trees?.life?.rootId || !data.trees?.map?.rootId) return null;
    return {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      trees: data.trees,
      weeks: data.weeks ?? {},
      pages: data.pages ?? [],
      notes: data.notes ?? {},
      noteBodies: data.noteBodies,
    };
  } catch {
    return null;
  }
}
