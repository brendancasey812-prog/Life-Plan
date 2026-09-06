import type { Reminder } from "./types";

/** Each reminder has a page behind it, like any other. */
export const reminderNoteKey = (id: string) => `reminder:${id}`;

export type DueTone = "overdue" | "today" | "soon" | "later" | "none";

/** Whole days from today to `due`, or null when there is no date. */
export function daysUntil(due: string, now = new Date()): number | null {
  if (!due) return null;
  const target = new Date(`${due}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function dueLabel(due: string, now = new Date()): { text: string; tone: DueTone } {
  const days = daysUntil(due, now);
  if (days === null) return { text: "No date", tone: "none" };
  if (days < -1) return { text: `${-days} days overdue`, tone: "overdue" };
  if (days === -1) return { text: "Yesterday", tone: "overdue" };
  if (days === 0) return { text: "Today", tone: "today" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  const date = new Date(`${due}T00:00:00`);
  if (days <= 6)
    return { text: date.toLocaleDateString(undefined, { weekday: "long" }), tone: "soon" };
  return {
    text: date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    }),
    tone: "later",
  };
}

/** Still to do, soonest first; anything undated after those, and done last. */
export function byDue(a: Reminder, b: Reminder): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (!a.due !== !b.due) return a.due ? -1 : 1;
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  return b.createdAt - a.createdAt;
}

export function reminderTitle(title: string): string {
  return title.trim() || "Untitled reminder";
}
