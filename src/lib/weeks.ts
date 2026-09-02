/**
 * The week grid uses a flat 52 weeks per year so every row lines up. That
 * drifts from the calendar by a day or so a year, which is fine for a life-
 * sized view and keeps "age 34, week 12" meaning one unambiguous cell.
 */
export const WEEKS_PER_YEAR = 52;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weekKey(age: number, week: number): string {
  return `${age}:${week}`;
}

function birthMs(birthDate: string): number {
  const ms = Date.parse(`${birthDate}T00:00:00`);
  return Number.isNaN(ms) ? Date.parse("2000-01-01T00:00:00") : ms;
}

/** Whole weeks lived as of `now`, or 0 before birth. */
export function weeksLived(birthDate: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - birthMs(birthDate)) / MS_PER_WEEK));
}

/** The cell the user is living in right now. */
export function currentCell(birthDate: string, now = Date.now()): { age: number; week: number } {
  const w = weeksLived(birthDate, now);
  return { age: Math.floor(w / WEEKS_PER_YEAR), week: w % WEEKS_PER_YEAR };
}

/** The Date a given cell starts on. */
export function cellStart(birthDate: string, age: number, week: number): Date {
  return new Date(birthMs(birthDate) + (age * WEEKS_PER_YEAR + week) * MS_PER_WEEK);
}

export function formatRange(birthDate: string, age: number, week: number): string {
  const start = cellStart(birthDate, age, week);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Calendar year the user turns `age`. */
export function calendarYear(birthDate: string, age: number): number {
  return new Date(birthMs(birthDate)).getFullYear() + age;
}
