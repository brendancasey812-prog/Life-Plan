/**
 * Calendar weeks, Monday to Sunday — the week as a diary keeps it, not the
 * 52-cell grid, whose weeks start on whatever weekday the birth date fell on.
 * A page is keyed by its Monday, so the week of 12 October 2026 is one page
 * however it is reached.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The Monday of the week `date` falls in, as `YYYY-MM-DD`. */
export function mondayOf(date = new Date()): string {
  const at = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay() is 0 on Sunday, which belongs to the week that began six days ago.
  const back = (at.getDay() + 6) % 7;
  at.setDate(at.getDate() - back);
  return iso(at);
}

export function iso(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function dateOf(monday: string): Date {
  const [y, m, d] = monday.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** `delta` weeks along, as a Monday. */
export function stepWeek(monday: string, delta: number): string {
  return iso(new Date(dateOf(monday).getTime() + delta * 7 * DAY));
}

/** The page behind a calendar week. Its own prefix: the grid's weeks differ. */
export const calendarWeekKey = (monday: string) => `cweek:${monday}`;

/** "12 – 18 October 2026", or across a month, "28 September – 4 October 2026". */
export function weekLabel(monday: string): string {
  const start = dateOf(monday);
  const end = new Date(start.getTime() + 6 * DAY);
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: "long" });
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
}

/** The short form the tab carries: "Oct 12 – 18". */
export function weekShort(monday: string): string {
  const start = dateOf(monday);
  const end = new Date(start.getTime() + 6 * DAY);
  const short = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return start.getMonth() === end.getMonth()
    ? `${short(start)} – ${end.getDate()}`
    : `${short(start)} – ${short(end)}`;
}
