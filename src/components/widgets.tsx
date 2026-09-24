"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Check,
  CalendarDays,
  CalendarRange,
  Cake,
  Compass,
  ImageIcon,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";
import { metaOf, readNote, updateNote } from "@/lib/notes";
import { toggleOutlineItem, type OutlineItem } from "@/lib/outline";
import { planetStyle } from "@/lib/planet";
import { byDue, daysUntil, dueLabel, reminderTitle, type DueTone } from "@/lib/reminders";
import { MONTHS } from "@/lib/seed";
import { usePlan } from "@/lib/store";
import type { NoteMeta, WidgetKind } from "@/lib/types";
import { useGoalPage, type Scope } from "@/lib/useGoalPage";
import { WEEKS_PER_YEAR, currentCell, weeksLived } from "@/lib/weeks";

export const WIDGETS: Record<WidgetKind, { label: string; hint: string; icon: typeof Cake }> = {
  age: { label: "Age", hint: "How far through the year you are", icon: Cake },
  date: { label: "Month & year", hint: "Today, at a glance", icon: CalendarDays },
  yearGoals: { label: "Yearly goals", hint: "This year's page", icon: Target },
  monthGoals: { label: "Monthly goals", hint: "This month's page", icon: CalendarDays },
  weeks: { label: "Weeks lived", hint: "The 100-year grid, in one bar", icon: CalendarRange },
  bubbles: { label: "Life Plan", hint: "Into the decades", icon: Sparkles },
  lifeMap: { label: "Life Categories", hint: "What you build your life around", icon: Compass },
  recentNotes: { label: "Recent pages", hint: "What you wrote last", icon: NotebookPen },
  reminders: { label: "Reminders", hint: "What is due, soonest first", icon: BellRing },
};

export function WidgetBody({ kind }: { kind: WidgetKind }) {
  switch (kind) {
    case "age":
      return <AgeWidget />;
    case "date":
      return <DateWidget />;
    case "yearGoals":
      return <GoalWidget scope="year" />;
    case "monthGoals":
      return <GoalWidget scope="month" />;
    case "weeks":
      return <WeeksWidget />;
    case "bubbles":
      return <BubblesWidget />;
    case "lifeMap":
      return <LifeMapWidget />;
    case "recentNotes":
      return <RecentNotesWidget />;
    case "reminders":
      return <RemindersWidget />;
  }
}

/** Exact age, and how far through the current year of life you are. */
function AgeWidget() {
  const birthDate = usePlan((s) => s.settings.birthDate);
  const name = usePlan((s) => s.settings.name);
  const { age, week } = currentCell(birthDate);
  const through = Math.min(100, Math.round((week / WEEKS_PER_YEAR) * 100));

  return (
    <div className="flex h-full flex-col justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex items-baseline gap-3">
        <span className="text-7xl leading-none font-semibold tracking-tight tabular-nums sm:text-8xl">
          {age}
        </span>
        <span className="text-base text-muted">
          years old
          {name ? <span className="block text-sm text-faint">{name}</span> : null}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-sm text-muted">
          <span>
            Week {week + 1} of your {ordinal(age + 1)} year
          </span>
          <span className="tabular-nums">{through}%</span>
        </div>
        <Meter value={through} />
        <p className="mt-2.5 text-sm text-faint">
          {WEEKS_PER_YEAR - week} weeks until you turn {age + 1}.
        </p>
      </div>
    </div>
  );
}

function DateWidget() {
  const birthDate = usePlan((s) => s.settings.birthDate);
  const now = new Date();
  const { week } = currentCell(birthDate);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-sm tracking-[0.14em] text-faint uppercase">
        {now.toLocaleDateString(undefined, { weekday: "long" })}
      </p>
      <p className="mt-1.5 text-4xl font-semibold tracking-tight">
        {MONTHS[now.getMonth()]} {now.getDate()}
      </p>
      <p className="text-2xl text-muted tabular-nums">{now.getFullYear()}</p>
      <p className="mt-2.5 text-sm text-faint">Week {week + 1} of this year of your life</p>
    </div>
  );
}

/** The same page the goal tab and the bubble open — not a copy of it. */
function GoalWidget({ scope }: { scope: Scope }) {
  const { period, noteKey, meta, trail } = useGoalPage(scope);
  const href = scope === "year" ? "/year" : "/month";
  const [eyebrow, heading] = period.title.split(" — ");

  return (
    <div className="flex h-full flex-col">
      <Link href={href} className="block">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-xs font-medium tracking-[0.14em] text-accentink uppercase">
              {eyebrow}
            </span>
            <span className="block text-2xl font-semibold tracking-tight">{heading}</span>
          </span>
          <ArrowUpRight size={17} className="mt-1.5 shrink-0 text-faint" />
        </span>
        <span className="block truncate text-sm text-faint">
          {trail.join("  ›  ") || "Life Plan"}
        </span>
      </Link>
      <GoalLines meta={meta} noteKey={noteKey} href={href} />
      {!!meta?.images && (
        <span className="mt-2.5 flex items-center gap-1.5 text-sm text-faint">
          <ImageIcon size={13} /> {meta.images} picture{meta.images === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

/** How many goals a card lists before it says how many are left. */
const SHOWN = 5;

/**
 * Every goal on a line of its own. A goal written as a checklist item gets a
 * real box here, and ticking it writes straight into the page — the same page
 * the goal tab and the timeline bubble open, so all three agree. A plain
 * paragraph has no box on the page either, so it keeps a bullet.
 */
function GoalLines({
  meta,
  noteKey,
  href,
}: {
  meta?: NoteMeta;
  noteKey: string | null;
  href: string;
}) {
  const setNoteMeta = usePlan((s) => s.setNoteMeta);
  const [busy, setBusy] = useState<number | null>(null);

  const items: OutlineItem[] = meta?.outline?.length
    ? meta.outline
    : // A page indexed before the outline existed still has its excerpt.
      meta?.excerpt
      ? [{ text: meta.excerpt }]
      : [];

  async function toggle(index: number, text: string) {
    if (!noteKey) return;
    setBusy(index);
    try {
      const body = await readNote(noteKey);
      const html = body && toggleOutlineItem(body.html, index, text);
      if (!html) return;
      setNoteMeta(noteKey, metaOf(await updateNote(noteKey, { html })));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="mt-3 flex-1 text-base text-muted">
        {meta?.images ? "" : "Nothing written yet — open it to start."}
      </p>
    );
  }

  return (
    <ul className="mt-3 flex-1 space-y-1.5">
      {items.slice(0, SHOWN).map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-base">
          {item.done === undefined ? (
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
          ) : (
            <button
              onClick={() => void toggle(i, item.text)}
              disabled={busy !== null}
              aria-pressed={item.done}
              aria-label={item.done ? `Untick ${item.text}` : `Tick ${item.text}`}
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                item.done
                  ? "border-transparent bg-done text-white"
                  : "border-edge2 text-transparent hover:border-accent"
              }`}
            >
              <Check size={12} />
            </button>
          )}
          <Link
            href={href}
            className={`min-w-0 flex-1 truncate ${item.done ? "text-faint line-through" : "text-muted"}`}
          >
            {item.text}
          </Link>
        </li>
      ))}
      {items.length > SHOWN && (
        <li className="pl-[28px] text-sm text-faint">+{items.length - SHOWN} more</li>
      )}
    </ul>
  );
}

function WeeksWidget() {
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const lived = weeksLived(birthDate);
  const total = (lifespan + 1) * WEEKS_PER_YEAR;
  const pct = Math.min(100, Math.round((lived / total) * 100));
  return (
    <Link href="/weeks" className="flex h-full flex-col justify-center">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">Weeks lived</h3>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </div>
      <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
        {lived.toLocaleString()}
        <span className="text-xl font-normal text-faint"> / {total.toLocaleString()}</span>
      </p>
      <Meter value={pct} />
      <p className="mt-2.5 text-sm text-faint">
        {pct}% of a {lifespan}-year life
      </p>
    </Link>
  );
}

function BubblesWidget() {
  const tree = usePlan((s) => s.trees.life);
  const opened = Object.keys(tree.nodes).length - 1;
  return (
    <Link href="/life" className="flex h-full flex-col justify-center">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">Life Plan</h3>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const size = 46 - i * 8;
          return (
            <span
              key={i}
              className="rounded-full"
              style={{ width: size, height: size, ...planetStyle(190 + i * 26, size / 2) }}
            />
          );
        })}
      </div>
      <p className="mt-3.5 text-sm text-faint">
        {opened > 0 ? `${opened} bubbles so far` : "Decades, years and months"}
      </p>
    </Link>
  );
}

function LifeMapWidget() {
  const tree = usePlan((s) => s.trees.map);
  const areas = (tree.nodes[tree.rootId]?.childIds ?? [])
    .map((id) => tree.nodes[id])
    .filter(Boolean);
  return (
    <Link href="/map" className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">Life Categories</h3>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {areas.map((a) => (
          <span
            key={a.id}
            className="rounded-full px-3 py-1.5 text-sm"
            style={{
              background: `hsl(${a.hue} var(--b-on-s) var(--b-on-l1) / 0.22)`,
              boxShadow: `inset 0 0 0 1px hsl(${a.hue} var(--b-on-s) var(--b-on-l1) / 0.35)`,
              color: "var(--fg)",
            }}
          >
            {a.label}
          </span>
        ))}
      </div>
    </Link>
  );
}

function RecentNotesWidget() {
  const notes = usePlan((s) => s.notes);
  const recent = Object.entries(notes)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, 3) as [string, NoteMeta][];
  return (
    <Link href="/notes" className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium">Recent pages</h3>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </div>
      {recent.length === 0 ? (
        <p className="mt-3 text-base text-faint">Nothing written yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map(([key, meta]) => (
            <li key={key} className="line-clamp-2 text-base text-muted">
              {meta.excerpt || "A page of pictures"}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

/** What is due, soonest first, with anything overdue called out. */
function RemindersWidget() {
  const reminders = usePlan((s) => s.reminders);
  const updateReminder = usePlan((s) => s.updateReminder);
  const due = useMemo(
    () =>
      [...reminders]
        .filter((r) => !r.done)
        .sort(byDue)
        .slice(0, 4),
    [reminders],
  );
  const overdue = reminders.filter((r) => !r.done && (daysUntil(r.due) ?? 1) < 0).length;

  return (
    <div className="flex h-full flex-col">
      <Link href="/reminders" className="flex items-baseline justify-between gap-2">
        <span className="text-base font-medium">Reminders</span>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </Link>

      {due.length === 0 ? (
        <p className="mt-3 text-base text-faint">Nothing outstanding.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {due.map((r) => {
            const label = dueLabel(r.due);
            return (
              <li key={r.id} className="flex items-start gap-2.5">
                {/* The same box the Reminders tab shows, on the same state. */}
                <button
                  onClick={() => updateReminder(r.id, { done: true })}
                  aria-label={`Mark ${reminderTitle(r.title)} done`}
                  className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-edge2 text-transparent transition hover:border-accent"
                >
                  <Check size={12} />
                </button>
                <Link href="/reminders" className="min-w-0 flex-1 truncate text-base text-muted">
                  {reminderTitle(r.title)}
                </Link>
                <span className={`shrink-0 text-sm ${TONE[label.tone]}`}>{label.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {overdue > 0 && <p className="mt-auto pt-3 text-sm text-dangerink">{overdue} overdue</p>}
    </div>
  );
}

const TONE: Record<DueTone, string> = {
  overdue: "text-dangerink font-medium",
  today: "text-accentink font-medium",
  soon: "text-muted",
  later: "text-faint",
  none: "text-faint",
};

function Meter({ value }: { value: number }) {
  return (
    <div
      className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface3"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
