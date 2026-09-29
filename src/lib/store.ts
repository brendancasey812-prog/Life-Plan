"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findTimeline, todayKey, type PeriodKey, type Scope } from "./goals";
import { goalNoteKey } from "./house";
import { byDue, reminderNoteKey } from "./reminders";
import {
  WEEKLY_GOALS_KEY,
  allNotes,
  appendTasks,
  bubbleNoteKey,
  excerptOf,
  metaOf,
  weekNoteKey,
  writeNote,
} from "./notes";
import { MONTHS, childHue, makeBubble, newId, nextHue, seedTrees } from "./seed";
import type {
  Bubble,
  Focus,
  HousePlan,
  LifeGoal,
  Listing,
  NoteMeta,
  Page,
  PlanState,
  Settings,
  Tree,
  TreeId,
  Reminder,
  WeekEntry,
  Widget,
  WidgetKind,
} from "./types";
import { weekKey } from "./weeks";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  birthDate: "2001-01-01",
  lifespan: 100,
  hiddenTabs: [],
  tabOrder: [],
};

/**
 * The house budget starts from the figures the plan was sketched with: what
 * is in the fund, what goes in a year, and what it earns. The cost of a house
 * is nobody's guess but the buyer's, so it starts empty.
 */
function defaultHouse(): HousePlan {
  return {
    cost: 0,
    depositPct: 20,
    startBalance: 40000,
    rate: 6,
    contribution: 24000,
    contributions: {},
    listings: [],
  };
}

function defaultGoals(): LifeGoal[] {
  return [
    {
      id: newId("g"),
      title: "A home by 30",
      targetAge: 30,
      done: false,
      plan: "house",
      createdAt: Date.now(),
    },
  ];
}

/** What the entry tab starts as: age first, then the rest of the plan. */
export function defaultWidgets(): Widget[] {
  const kinds: [WidgetKind, 1 | 2 | 3 | 4][] = [
    ["age", 4],
    ["yearGoals", 4],
    ["lastYearGoals", 4],
    ["monthGoals", 4],
    ["lastMonthGoals", 4],
    // A row of four: the day, what is due, and the week ahead.
    ["date", 1],
    ["reminders", 2],
    ["weeks", 1],
    ["weeklyGoals", 2],
    ["lifeGoals", 2],
    ["bubbles", 1],
    ["lifeMap", 1],
    ["recentNotes", 1],
  ];
  return kinds.map(([kind, span]) => ({ id: newId("w"), kind, span }));
}

interface Actions {
  /** Fills in a timeline bubble's children the first time it is opened. */
  openBubble: (tree: TreeId, id: string) => void;
  addBubble: (tree: TreeId, parentId: string, label: string) => string | null;
  renameBubble: (tree: TreeId, id: string, label: string) => void;
  /** How many columns a bubble's tile takes. */
  resizeBubble: (tree: TreeId, id: string, span: 1 | 2 | 3 | 4) => void;
  /** Drops a bubble into the slot a sibling holds. */
  moveBubble: (tree: TreeId, fromId: string, toId: string) => void;
  /** Sets every bubble under a parent to the same width. */
  resizeChildren: (tree: TreeId, parentId: string, span: 1 | 2 | 3 | 4) => void;
  /** Deletes the bubble and its descendants, returning their note keys. */
  deleteBubble: (tree: TreeId, id: string) => string[];
  setWeekDone: (age: number, week: number, done: boolean) => void;
  /** Points the goal tabs, the header and the dashboard at a period. */
  setFocus: (scope: Scope, key: PeriodKey | null) => void;
  /**
   * Generates whatever of the My Life timeline a period needs, so the goal
   * tabs and the bubbles are looking at exactly the same page.
   */
  resolveTimeline: (age: number, month?: number) => void;
  addGoal: (title: string, targetAge: number) => string;
  updateGoal: (id: string, patch: Partial<Omit<LifeGoal, "id" | "createdAt">>) => void;
  deleteGoal: (id: string) => void;
  updateHouse: (patch: Partial<Omit<HousePlan, "listings" | "contributions">>) => void;
  /** What goes into the fund in one year; clearing it falls back to the rest. */
  setContribution: (age: number, amount: number | null) => void;
  addListing: () => string;
  updateListing: (id: string, patch: Partial<Omit<Listing, "id">>) => void;
  deleteListing: (id: string) => void;
  addPage: (title: string) => string;
  addReminder: (title: string) => string;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => void;
  deleteReminder: (id: string) => void;
  renamePage: (id: string, title: string) => void;
  deletePage: (id: string) => void;
  addWidget: (kind: WidgetKind) => void;
  removeWidget: (id: string) => void;
  resizeWidget: (id: string, span: 1 | 2 | 3 | 4) => void;
  /** Drops the dragged card into the slot the other one occupies. */
  moveWidget: (fromId: string, toId: string) => void;
  /** Shifts a card one slot back or forward, for boards without a mouse. */
  nudgeWidget: (id: string, delta: -1 | 1) => void;
  resetWidgets: () => void;
  /** Records what a note page holds; null once the page is empty or gone. */
  setNoteMeta: (key: string, meta: NoteMeta | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: PlanState) => void;
  resetAll: () => void;
}

export type PlanStore = PlanState & Actions;

const NO_FOCUS: Focus = { year: null, month: null };

/** October 2026: the month the plan is being written for. */
const PLANNING: PeriodKey = { year: 2026, month: 9 };

/**
 * Where a plan starts out pointed. The monthly views open on the month being
 * planned rather than the one running out; once today is past it, today is the
 * better guess and they follow it again. Either way the chip on the goal tab
 * steps back to today.
 */
function initialFocus(now = new Date()): Focus {
  const today = todayKey("month", now);
  const past = today.year > PLANNING.year || (today.year === PLANNING.year && today.month! > 9);
  return { year: null, month: past ? null : PLANNING };
}

function emptyState(): PlanState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    focus: initialFocus(),
    trees: seedTrees(),
    weeks: {},
    pages: [],
    reminders: [],
    notes: {},
    widgets: defaultWidgets(),
    goals: defaultGoals(),
    house: defaultHouse(),
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
          hue: nextHue(parent.hue, index),
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

      resizeBubble: (treeId, id, span) => {
        const tree = get().trees[treeId];
        const node = tree?.nodes[id];
        if (!node) return;
        set((s) =>
          withTree(s, treeId, { ...tree, nodes: { ...tree.nodes, [id]: { ...node, span } } }),
        );
      },

      resizeChildren: (treeId, parentId, span) => {
        const tree = get().trees[treeId];
        const parent = tree?.nodes[parentId];
        if (!parent) return;
        const nodes = { ...tree.nodes };
        for (const id of parent.childIds) {
          if (nodes[id]) nodes[id] = { ...nodes[id], span };
        }
        set((s) => withTree(s, treeId, { ...tree, nodes }));
      },

      moveBubble: (treeId, fromId, toId) => {
        const tree = get().trees[treeId];
        const from = tree?.nodes[fromId];
        const parent = from?.parentId ? tree.nodes[from.parentId] : null;
        if (!parent || !parent.childIds.includes(toId)) return;
        const childIds = [...parent.childIds];
        const at = childIds.indexOf(fromId);
        const onto = childIds.indexOf(toId);
        if (at < 0 || onto < 0 || at === onto) return;
        childIds.splice(onto, 0, ...childIds.splice(at, 1));
        set((s) =>
          withTree(s, treeId, {
            ...tree,
            nodes: { ...tree.nodes, [parent.id]: { ...parent, childIds } },
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

      setFocus: (scope, key) => set((s) => ({ focus: { ...s.focus, [scope]: key } })),

      resolveTimeline: (age, month) => {
        if (age < 0 || age > get().settings.lifespan) return;
        // Each step opens the level above before looking inside it; a level
        // whose bubbles were deleted stays empty and the page says so.
        get().openBubble("life", get().trees.life.rootId);
        const found = () => findTimeline(get().trees.life, age, month);
        const decadeOrYear = found();
        if (decadeOrYear.complete) return;

        const tree = get().trees.life;
        const root = tree.nodes[tree.rootId];
        const decade = root.childIds
          .map((id) => tree.nodes[id])
          .find(
            (n) => n?.ageFrom !== undefined && age >= n.ageFrom && age <= (n.ageTo ?? n.ageFrom),
          );
        if (!decade) return;
        get().openBubble("life", decade.id);

        const withYear = found();
        if (!withYear.yearId || month === undefined) return;
        get().openBubble("life", withYear.yearId);
      },

      addGoal: (title, targetAge) => {
        const goal: LifeGoal = {
          id: newId("g"),
          title,
          targetAge,
          done: false,
          createdAt: Date.now(),
        };
        set((s) => ({ goals: [...s.goals, goal].sort(byTargetAge) }));
        return goal.id;
      },

      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)).sort(byTargetAge),
        })),

      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          notes: withoutKeys(s.notes, [goalNoteKey(id)]),
        })),

      updateHouse: (patch) => set((s) => ({ house: { ...s.house, ...patch } })),

      setContribution: (age, amount) =>
        set((s) => {
          const contributions = { ...s.house.contributions };
          if (amount === null) delete contributions[String(age)];
          else contributions[String(age)] = amount;
          return { house: { ...s.house, contributions } };
        }),

      addListing: () => {
        const listing: Listing = {
          id: newId("h"),
          address: "",
          city: "",
          state: "",
          link: "",
          notes: "",
        };
        set((s) => ({ house: { ...s.house, listings: [...s.house.listings, listing] } }));
        return listing.id;
      },

      updateListing: (id, patch) =>
        set((s) => ({
          house: {
            ...s.house,
            listings: s.house.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          },
        })),

      deleteListing: (id) =>
        set((s) => ({
          house: { ...s.house, listings: s.house.listings.filter((l) => l.id !== id) },
        })),

      addPage: (title) => {
        const page: Page = { id: newId("p"), title, createdAt: Date.now() };
        set((s) => ({ pages: [page, ...s.pages] }));
        return page.id;
      },

      // Kept exactly as typed, empty included, so backspacing a title works;
      // `pageTitle` supplies the fallback wherever one is shown.
      addReminder: (title) => {
        const reminder: Reminder = {
          id: newId("r"),
          title,
          due: "",
          done: false,
          createdAt: Date.now(),
        };
        set((s) => ({ reminders: [reminder, ...s.reminders].sort(byDue) }));
        return reminder.id;
      },

      updateReminder: (id, patch) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)).sort(byDue),
        })),

      deleteReminder: (id) =>
        set((s) => ({
          reminders: s.reminders.filter((r) => r.id !== id),
          notes: withoutKeys(s.notes, [reminderNoteKey(id)]),
        })),

      renamePage: (id, title) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)) })),

      deletePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id),
          notes: withoutKeys(s.notes, [`page:${id}`]),
        })),

      addWidget: (kind) =>
        set((s) => ({ widgets: [...s.widgets, { id: newId("w"), kind, span: 1 }] })),

      removeWidget: (id) => set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),

      resizeWidget: (id, span) =>
        set((s) => ({ widgets: s.widgets.map((w) => (w.id === id ? { ...w, span } : w)) })),

      moveWidget: (fromId, toId) =>
        set((s) => {
          const from = s.widgets.findIndex((w) => w.id === fromId);
          const to = s.widgets.findIndex((w) => w.id === toId);
          if (from < 0 || to < 0 || from === to) return {};
          const widgets = [...s.widgets];
          const [moved] = widgets.splice(from, 1);
          widgets.splice(to, 0, moved);
          return { widgets };
        }),

      nudgeWidget: (id, delta) =>
        set((s) => {
          const from = s.widgets.findIndex((w) => w.id === id);
          const to = from + delta;
          if (from < 0 || to < 0 || to >= s.widgets.length) return {};
          const widgets = [...s.widgets];
          const [moved] = widgets.splice(from, 1);
          widgets.splice(to, 0, moved);
          return { widgets };
        }),

      resetWidgets: () => set({ widgets: defaultWidgets() }),

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
      version: 16,
      partialize: (s): PlanState => ({
        settings: s.settings,
        focus: s.focus,
        trees: s.trees,
        weeks: s.weeks,
        pages: s.pages,
        reminders: s.reminders,
        notes: s.notes,
        widgets: s.widgets,
        goals: s.goals,
        house: s.house,
      }),
      migrate: async (persisted, version) => {
        const state = persisted as PlanState;
        // The entry tab became a widget board; a plan from before it gets the
        // default layout.
        if (!state.widgets?.length) state.widgets = defaultWidgets();
        state.reminders ??= [];

        // A board arranged before reminders existed would never show them, so
        // put one in beside the goals rather than leaving it to be found.
        if (!state.widgets.some((w) => w.kind === "reminders")) {
          const card: Widget = { id: newId("w"), kind: "reminders", span: 2 };
          const afterGoals = state.widgets.findLastIndex(
            (w) => w.kind === "yearGoals" || w.kind === "monthGoals",
          );
          state.widgets = [...state.widgets];
          state.widgets.splice(afterGoals < 0 ? state.widgets.length : afterGoals + 1, 0, card);
        }

        // The goal cards used to land side by side, offset across the rows.
        // Put them full width and one after the other. Version-gated: later
        // releases pair each with the period before it, and this would undo
        // that arrangement every time the plan was upgraded again.
        const yearAt = state.widgets.findIndex((w) => w.kind === "yearGoals");
        const monthAt = state.widgets.findIndex((w) => w.kind === "monthGoals");
        if (version < 10 && yearAt >= 0 && monthAt >= 0) {
          const widgets = state.widgets.map((w) =>
            w.kind === "yearGoals" || w.kind === "monthGoals" ? { ...w, span: 3 as const } : w,
          );
          const [month] = widgets.splice(monthAt, 1);
          widgets.splice(widgets.findIndex((w) => w.kind === "yearGoals") + 1, 0, month);
          state.widgets = widgets;
        }

        // Focus arrived with the period steppers; before them every view
        // simply followed today, so an upgraded plan starts where a new one
        // does rather than somewhere of its own.
        if (version < 10) state.focus = initialFocus();
        state.focus ??= { ...NO_FOCUS };

        // The past-period cards are new, so a board arranged before them
        // would never show them. Each goes beside the period it looks back
        // from rather than at the end, where it would be missed.
        const pairs: [WidgetKind, WidgetKind][] = [
          ["yearGoals", "lastYearGoals"],
          ["monthGoals", "lastMonthGoals"],
        ];
        for (const [beside, kind] of pairs) {
          if (state.widgets.some((w) => w.kind === kind)) continue;
          const at = state.widgets.findIndex((w) => w.kind === beside);
          const widgets = [...state.widgets];
          widgets.splice(at < 0 ? widgets.length : at + 1, 0, { id: newId("w"), kind, span: 3 });
          state.widgets = widgets;
        }

        // The standing weekly list is new. It goes beside the date card, which
        // means moving the pair to the head of the short cards so the two of
        // them start a row together rather than landing on separate ones.
        if (!state.widgets.some((w) => w.kind === "weeklyGoals")) {
          const rest = state.widgets.filter((w) => w.kind !== "date");
          const date = state.widgets.find((w) => w.kind === "date");
          const pair: Widget[] = [
            { id: date?.id ?? newId("w"), kind: "date", span: 1 },
            { id: newId("w"), kind: "weeklyGoals", span: 2 },
          ];
          const at = rest.findIndex((w) => w.kind === "reminders");
          rest.splice(at < 0 ? rest.length : at, 0, ...pair);
          state.widgets = rest;
        }

        // The board went from three columns to four. A card that filled the
        // old row should still fill the new one; the rest keep their width,
        // which they can now change to any of the four.
        if (version < 12) {
          state.widgets = state.widgets.map((w) => (w.span === 3 ? { ...w, span: 4 } : w));

          // The date card belongs beside what is due, which the old three-wide
          // row could not hold together. Ordering alone will not do it: a
          // two-column card ahead of the pair leaves a single slot, and the
          // wider of them drops to the next row. So the short cards are dealt
          // into rows that fill — the day, what is due and the week; then the
          // standing list with the two bubble cards.
          const ROWS: WidgetKind[] = [
            "date",
            "reminders",
            "weeks",
            "weeklyGoals",
            "bubbles",
            "lifeMap",
            "recentNotes",
          ];
          const rank = (w: Widget, i: number) => {
            const at = ROWS.indexOf(w.kind);
            // A card of the user's own stays where it was, after the rest.
            return at < 0 ? ROWS.length + i : at;
          };
          const full = state.widgets.filter((w) => w.span === 4);
          const short = state.widgets
            .map((w, i) => ({ w, i }))
            .filter(({ w }) => w.span !== 4)
            .sort((a, b) => rank(a.w, a.i) - rank(b.w, b.i))
            .map(({ w }) => w);
          state.widgets = [...full, ...short];
        }

        // Asked for: the standing week should carry the body as well as the
        // work. Added once, and only the lines the list does not already have,
        // so anything written there is left as it is.
        if (version < 13) {
          try {
            const body = await appendTasks(WEEKLY_GOALS_KEY, [
              "Physical activity",
              "Self-care stretching",
              "Yoga mat",
              "Acupressure",
            ]);
            const meta = body && metaOf(body);
            if (meta) state.notes = { ...(state.notes ?? {}), [WEEKLY_GOALS_KEY]: meta };
          } catch {
            // No IndexedDB to write to; the list stays as it was.
          }
        }

        // Life goals and the house budget are new; a plan from before them
        // starts with the home, since that is the one it was built for.
        state.goals ??= defaultGoals();
        state.house = { ...defaultHouse(), ...state.house };
        if (!state.widgets.some((w) => w.kind === "lifeGoals")) {
          const widgets = [...state.widgets];
          const at = widgets.findIndex((w) => w.kind === "weeklyGoals");
          widgets.splice(at < 0 ? widgets.length : at + 1, 0, {
            id: newId("w"),
            kind: "lifeGoals",
            span: 2,
          });
          state.widgets = widgets;
        }

        // The colours were spread around the whole wheel, which made a board
        // of a dozen tiles a rainbow. They walk a green-to-blue band now, and
        // a plan's bubbles are recoloured to it — hue is generated, never
        // chosen, so nothing of the user's is lost by redoing it.
        if (version < 16) {
          for (const treeId of ["life", "map"] as TreeId[]) {
            const tree = state.trees?.[treeId];
            const root = tree?.nodes[tree.rootId];
            if (!tree || !root) continue;
            root.hue = treeId === "life" ? 205 : 168;
            const queue = [root.id];
            while (queue.length) {
              const node = tree.nodes[queue.shift()!];
              if (!node) continue;
              node.childIds.forEach((id, i) => {
                const kid = tree.nodes[id];
                if (!kid) return;
                kid.hue = childHue(node.hue, i, node.childIds.length);
                queue.push(id);
              });
            }
          }
        }

        // The index gained per-line content, then each line's ticked state,
        // then whether each line can carry a box at all, and later room for
        // more lines of a page than a card shows at once. Rebuild every meta
        // from its body so pages written before any of that show their goals
        // stacked, tickable, and whole when a card is expanded.
        if (version < 15) {
          try {
            const bodies = await allNotes();
            const notes = { ...(state.notes ?? {}) };
            for (const [key, body] of Object.entries(bodies)) {
              const meta = metaOf(body);
              if (meta) notes[key] = meta;
              else delete notes[key];
            }
            state.notes = notes;
          } catch {
            // No IndexedDB to read; the metas fill in as pages are saved.
          }
        }

        // The two roots were renamed. Only rename one that still carries its
        // old default — anything the user chose themselves is theirs.
        const rename = (treeId: TreeId, was: string, now: string) => {
          const tree = state.trees?.[treeId];
          const root = tree?.nodes[tree.rootId];
          if (root?.label === was) root.label = now;
        };
        rename("life", "My Life", "Life Plan");
        rename("map", "Life Map", "Life Categories");
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
          writes.push(
            writeNote(key, { html, text, images: 0, gallery: [], updatedAt: Date.now() }),
          );
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
        return { ...state, weeks, pages: state.pages ?? [], notes, widgets: state.widgets };
      },
    },
  ),
);

/** Soonest first, then anything already true. */
export function byTargetAge(a: LifeGoal, b: LifeGoal): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  return a.targetAge - b.targetAge || a.createdAt - b.createdAt;
}

export function pageTitle(title: string): string {
  return title.trim() || "Untitled page";
}

/** Everything an export carries. Anything missing here is silently lost. */
export function exportable(s: PlanState): PlanState {
  return {
    settings: s.settings,
    focus: s.focus,
    trees: s.trees,
    weeks: s.weeks,
    pages: s.pages,
    reminders: s.reminders,
    notes: s.notes,
    widgets: s.widgets,
    goals: s.goals,
    house: s.house,
  };
}

/** Parses an exported plan, returning null rather than throwing on junk. */
export function parsePlan(text: string): (PlanState & { noteBodies?: unknown }) | null {
  try {
    const data = JSON.parse(text) as Partial<PlanState> & { noteBodies?: unknown };
    if (!data.trees?.life?.rootId || !data.trees?.map?.rootId) return null;
    return {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      focus: { ...NO_FOCUS, ...data.focus },
      trees: data.trees,
      weeks: data.weeks ?? {},
      pages: data.pages ?? [],
      reminders: data.reminders ?? [],
      notes: data.notes ?? {},
      widgets: data.widgets?.length ? data.widgets : defaultWidgets(),
      goals: data.goals ?? defaultGoals(),
      house: { ...defaultHouse(), ...data.house },
      noteBodies: data.noteBodies,
    };
  } catch {
    return null;
  }
}
