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
  images: number;
  updatedAt: number;
}

/** The cards the entry tab is built from. */
export type WidgetKind =
  | "age"
  | "date"
  | "yearGoals"
  | "monthGoals"
  | "bubbles"
  | "weeks"
  | "lifeMap"
  | "recentNotes";

export interface Widget {
  id: string;
  kind: WidgetKind;
  /** Columns it takes on a wide screen, out of three. */
  span: 1 | 2 | 3;
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
}

export interface PlanState {
  settings: Settings;
  trees: Record<TreeId, Tree>;
  weeks: Record<string, WeekEntry>;
  pages: Page[];
  /** Note key -> what is in that page. Bodies live in IndexedDB. */
  notes: Record<string, NoteMeta>;
  /** The entry tab's layout, in the order the cards appear. */
  widgets: Widget[];
}

/** A plan plus every note body, as written by Export and read by Import. */
export interface PlanExport extends PlanState {
  noteBodies: Record<string, NoteBody>;
}
