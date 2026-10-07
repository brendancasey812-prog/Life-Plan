/** The two bubble trees the app renders — one per bubble tab. */
export type TreeId = "life" | "map" | "rooms";

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
  /** Columns its tile takes on a wide board, out of four. Defaults to one. */
  span?: 1 | 2 | 3 | 4;
}

export interface Tree {
  rootId: string;
  nodes: Record<string, Bubble>;
}

/** One cell of the years x weeks grid. Keyed `${age}:${week}`. */
export interface WeekEntry {
  done: boolean;
}

/**
 * A note page: rich text plus any pictures pasted into it, as one HTML blob.
 * Bodies are big, so they live in IndexedDB and only `NoteMeta` is kept in the
 * main store — enough to list, search and flag a page without loading it.
 */
export interface NoteBody {
  html: string;
  /** Plain text of the page, for excerpts and search. */
  text: string;
  /** How many pictures sit inline in the text. */
  images: number;
  /** Pictures pinned to the page's boards, as data URLs. */
  gallery: string[];
  updatedAt: number;
}

export interface NoteMeta {
  excerpt: string;
  /**
   * The page's first lines, one entry per paragraph, bullet or checklist
   * item, each with its ticked state — so a widget can stack them instead of
   * running them together the way `excerpt` does, and tick the same boxes the
   * page shows.
   */
  outline?: OutlineItem[];
  images: number;
  updatedAt: number;
}

import type { OutlineItem } from "./outline";
import type { PeriodKey } from "./goals";

/** The cards the entry tab is built from. */
export type WidgetKind =
  | "age"
  | "date"
  | "yearGoals"
  | "monthGoals"
  | "lastYearGoals"
  | "lastMonthGoals"
  | "weeklyGoals"
  | "lifeGoals"
  | "bubbles"
  | "weeks"
  | "lifeMap"
  | "recentNotes"
  | "reminders";

export interface Widget {
  id: string;
  kind: WidgetKind;
  /** Columns it takes on a wide screen, out of four. */
  span: 1 | 2 | 3 | 4;
}

/**
 * Something to be true by a given age — the long horizon the timeline is for.
 * A goal with a `plan` also has a tab of its own working the numbers out.
 */
export interface LifeGoal {
  id: string;
  title: string;
  /** The age it should be true by; it shows on that bubble of the timeline. */
  targetAge: number;
  done: boolean;
  /** The planning tab behind it, where there is one. */
  plan?: "house";
  createdAt: number;
}

/** A house someone has found and wants to keep track of. */
export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  link: string;
  notes: string;
}

/**
 * The house budget: what it costs, what has to be saved, and what the fund
 * does between now and the year it is needed. Every figure here is the user's
 * to change — the rest is worked out from them.
 */
export interface HousePlan {
  /** What the house costs, and the deposit as a percentage of it. */
  cost: number;
  depositPct: number;
  /** What is in the fund today, and what it earns a year, as a percentage. */
  startBalance: number;
  rate: number;
  /** Put away each year, and any year that differs, keyed by age. */
  contribution: number;
  contributions: Record<string, number>;
  listings: Listing[];
}

/** Something to do, with a page of its own behind it. */
export interface Reminder {
  id: string;
  title: string;
  /** ISO `YYYY-MM-DD`, or "" when it is not tied to a day. */
  due: string;
  done: boolean;
  createdAt: number;
}

/** A note page that stands on its own, rather than hanging off a bubble. */
export interface Page {
  id: string;
  title: string;
  createdAt: number;
}

export interface Settings {
  name: string;
  /** ISO `YYYY-MM-DD`. Anchors the week grid and the calendar-year labels. */
  birthDate: string;
  /** Highest age the timeline and week grid run to. */
  lifespan: number;
  /** Tabs taken off the bar, by route. Everything else is shown. */
  hiddenTabs?: string[];
  /** The order they sit in. A tab not listed keeps its place at the end. */
  tabOrder?: string[];
}

/**
 * Which period the plan is pointed at. The goal tabs, the header labels and
 * the dashboard's goal cards all read it, so stepping to a month on one of
 * them moves the others with it. Null follows today.
 */
export interface Focus {
  year: PeriodKey | null;
  month: PeriodKey | null;
}

/**
 * A part on a grid page, in the page's own units: where it sits and how big
 * it is, seen from above. One rectangle is enough for a plan of a table — a
 * leg, a rail, a sheet of glass — and the legend reads the materials off them.
 */
export interface BlueprintPart {
  id: string;
  label: string;
  material: string;
  /** Top-left corner, in units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Thickness or height off the plan, for the legend. Optional. */
  thickness?: number;
  notes?: string;
}

/** A grid page: a drawing to scale, with its parts and what they are made of. */
export interface Blueprint {
  title: string;
  unit: "in" | "cm" | "mm";
  /** Units between grid lines. */
  grid: number;
  /** The sheet's size in units, which the drawing is scaled to fit. */
  width: number;
  height: number;
  parts: BlueprintPart[];
  notes: string;
  updatedAt: number;
}

export interface PlanState {
  settings: Settings;
  focus: Focus;
  trees: Record<TreeId, Tree>;
  weeks: Record<string, WeekEntry>;
  pages: Page[];
  reminders: Reminder[];
  /** Note key -> what is in that page. Bodies live in IndexedDB. */
  notes: Record<string, NoteMeta>;
  /** The entry tab's layout, in the order the cards appear. */
  widgets: Widget[];
  /** Grid pages, keyed the way note pages are. */
  blueprints: Record<string, Blueprint>;
  /** The long horizon: what should be true by when. */
  goals: LifeGoal[];
  house: HousePlan;
}

/** A plan plus every note body, as written by Export and read by Import. */
export interface PlanExport extends PlanState {
  noteBodies: Record<string, NoteBody>;
}
