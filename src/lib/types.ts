/** The two bubble trees the app renders — one per bubble tab. */
export type TreeId = "life" | "map";

/**
 * What a bubble's children should be filled with the first time it is opened.
 * Building all 1,300-odd timeline bubbles up front would be wasteful, so the
 * timeline levels are generated lazily and then behave like any other bubble.
 */
export type Generator = "decades" | "years" | "months";

export interface Bubble {
  id: string;
  label: string;
  parentId: string | null;
  childIds: string[];
  /** Free-text notes for this bubble — goals, plans, whatever it holds. */
  note: string;
  /** 0–360; drives the bubble's colour. Children inherit a shifted hue. */
  hue: number;
  /** Set once `generate` has run, so deleting generated bubbles sticks. */
  seeded?: boolean;
  generate?: Generator;
  /** Age span this bubble covers, for timeline bubbles only. */
  ageFrom?: number;
  ageTo?: number;
  /** Month index 0–11, for month bubbles only. */
  month?: number;
}

export interface Tree {
  rootId: string;
  nodes: Record<string, Bubble>;
}

/** One cell of the years x weeks grid. Keyed `${age}:${week}`. */
export interface WeekEntry {
  note: string;
  done: boolean;
}

export interface Settings {
  name: string;
  /** ISO `YYYY-MM-DD`. Anchors the week grid and the calendar-year labels. */
  birthDate: string;
  /** Highest age the timeline and week grid run to. */
  lifespan: number;
}

export interface PlanState {
  settings: Settings;
  trees: Record<TreeId, Tree>;
  weeks: Record<string, WeekEntry>;
}
