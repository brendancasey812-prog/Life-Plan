import { MONTHS } from "./seed";
import type { Bubble, Tree } from "./types";
import { calendarYear } from "./weeks";

/** Which of the two goal tabs a period belongs to. */
export type Scope = "year" | "month";

/**
 * A period, as the plan stores it: a calendar year, plus a month for the
 * monthly views. Absolute rather than an offset from today, so the header,
 * the dashboard and the goal tabs can all be pointed at one month and still
 * agree about it tomorrow.
 */
export interface PeriodKey {
  year: number;
  /** 0–11 for a month; undefined for a whole year. */
  month?: number;
}

export interface Period extends PeriodKey {
  /** Age reached in that year — the timeline is indexed by age, not by year. */
  age: number;
  title: string;
}

/** The period today falls in. */
export function todayKey(scope: Scope, now = new Date()): PeriodKey {
  return scope === "year"
    ? { year: now.getFullYear() }
    : { year: now.getFullYear(), month: now.getMonth() };
}

/** `delta` periods along — a month for a month key, a year for a year key. */
export function stepKey(key: PeriodKey, delta: number): PeriodKey {
  if (key.month === undefined) return { year: key.year + delta };
  // Day 1 keeps the step from skipping a short month.
  const at = new Date(key.year, key.month + delta, 1);
  return { year: at.getFullYear(), month: at.getMonth() };
}

export function sameKey(a: PeriodKey, b: PeriodKey): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Fills a key out with the age it falls in and the heading to show. */
export function periodOf(birthDate: string, lifespan: number, key: PeriodKey): Period {
  const birthYear = calendarYear(birthDate, 0);
  const age = Math.min(Math.max(key.year - birthYear, 0), lifespan);
  const title =
    key.month === undefined
      ? `Yearly Goals — ${key.year}`
      : `Monthly Goals — ${MONTHS[key.month]} ${key.year}`;
  return { ...key, age, title };
}

/** Whether a period is inside the plan at all. */
export function withinPlan(birthDate: string, lifespan: number, key: PeriodKey): boolean {
  const birthYear = calendarYear(birthDate, 0);
  return key.year >= birthYear && key.year <= birthYear + lifespan;
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
