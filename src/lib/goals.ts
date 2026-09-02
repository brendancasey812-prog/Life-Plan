import { MONTHS } from "./seed";
import type { Bubble, Tree } from "./types";
import { calendarYear } from "./weeks";

export interface Period {
  /** Calendar year the page covers. */
  year: number;
  /** 0–11 for a month page; undefined for a year page. */
  month?: number;
  /** Age reached in that year — the timeline is indexed by age, not by year. */
  age: number;
  title: string;
}

/** The year and month the goal tabs open on: this one. */
export function currentPeriod(birthDate: string, lifespan: number, now = new Date()): Period[] {
  const year = now.getFullYear();
  const birthYear = calendarYear(birthDate, 0);
  const age = Math.min(Math.max(year - birthYear, 0), lifespan);
  return [
    { year, age, title: `Yearly Goals — ${year}` },
    {
      year,
      month: now.getMonth(),
      age,
      title: `Monthly Goals — ${MONTHS[now.getMonth()]} ${year}`,
    },
  ];
}

export interface Found {
  /** The `Age N` bubble, once it exists. */
  yearId: string | null;
  /** The month bubble under it, for month pages. */
  monthId: string | null;
  /** True when everything the page needs has been generated. */
  complete: boolean;
}

const kids = (tree: Tree, id: string): Bubble[] =>
  (tree.nodes[id]?.childIds ?? []).map((c) => tree.nodes[c]).filter(Boolean);

/**
 * Walks My Life for the bubble a period belongs to. The timeline is built
 * lazily, so this reports what is there rather than creating anything —
 * `resolveTimeline` in the store fills in whatever is missing.
 */
export function findTimeline(tree: Tree, age: number, month?: number): Found {
  const miss: Found = { yearId: null, monthId: null, complete: false };
  if (!tree?.nodes[tree.rootId]) return miss;

  const decade = kids(tree, tree.rootId).find(
    (n) => n.ageFrom !== undefined && age >= n.ageFrom && age <= (n.ageTo ?? n.ageFrom),
  );
  if (!decade) return miss;

  const year = kids(tree, decade.id).find((n) => n.ageFrom === age && n.month === undefined);
  if (!year) return miss;
  if (month === undefined) return { yearId: year.id, monthId: null, complete: true };

  const monthNode = kids(tree, year.id).find((n) => n.month === month);
  return { yearId: year.id, monthId: monthNode?.id ?? null, complete: !!monthNode };
}

/** Breadcrumb from My Life down to a bubble, for showing where a page lives. */
export function trailOf(tree: Tree, id: string): string[] {
  const out: string[] = [];
  for (let cur: string | null = id; cur; cur = tree.nodes[cur]?.parentId ?? null) {
    out.unshift(tree.nodes[cur]?.label ?? "");
  }
  return out;
}
