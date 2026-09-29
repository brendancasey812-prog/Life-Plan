"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Check,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Cake,
  Compass,
  Flag,
  History,
  ImageIcon,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";
import { planetStyle } from "@/lib/planet";
import { goalNoteKey } from "@/lib/house";
import { byDue, daysUntil, dueLabel, reminderTitle, type DueTone } from "@/lib/reminders";
import { MONTHS } from "@/lib/seed";
import { OutlineList } from "./OutlineList";
import { WeeklyGoals } from "./WeeklyGoals";
import { byTargetAge, usePlan } from "@/lib/store";
import type { NoteMeta, WidgetKind } from "@/lib/types";
import { useGoalPage, type Scope } from "@/lib/useGoalPage";
import { WEEKS_PER_YEAR, calendarYear, currentCell, weeksLived } from "@/lib/weeks";

export const WIDGETS: Record<WidgetKind, { label: string; hint: string; icon: typeof Cake }> = {
  age: { label: "Age", hint: "How far through the year you are", icon: Cake },
  date: { label: "Month & year", hint: "Today, at a glance", icon: CalendarDays },
  yearGoals: { label: "Yearly goals", hint: "The year you are on", icon: Target },
  monthGoals: { label: "Monthly goals", hint: "The month you are on", icon: CalendarDays },
  lastYearGoals: { label: "Last year", hint: "The year before that one", icon: History },
  lastMonthGoals: { label: "Last month", hint: "The month before that one", icon: History },
  weeklyGoals: {
    label: "Weekly goals",
    hint: "The standing list, every week",
    icon: CalendarCheck,
  },
  lifeGoals: { label: "Life goals", hint: "What should be true by when", icon: Flag },
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
    case "lastYearGoals":
      return <GoalWidget scope="year" shift={-1} />;
    case "lastMonthGoals":
      return <GoalWidget scope="month" shift={-1} />;
    case "weeklyGoals":
      return <WeeklyGoals />;
    case "lifeGoals":
      return <LifeGoalsWidget />;
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
      {/* A single column of four is narrow; the date reads better than it
          wraps. */}
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-balance">
        {MONTHS[now.getMonth()]} {now.getDate()}
      </p>
      <p className="text-xl text-muted tabular-nums">{now.getFullYear()}</p>
      <p className="mt-2.5 text-sm text-faint">Week {week + 1} of this year of your life</p>
    </div>
  );
}

/**
 * The same page the goal tab and the bubble open — not a copy of it. `shift`
 * looks at a neighbouring period instead of the one in focus, which is what
 * the two "last" cards are; opening one points the plan at it.
 */
function GoalWidget({ scope, shift = 0 }: { scope: Scope; shift?: number }) {
  const { period, noteKey, meta, trail, pin } = useGoalPage(scope, shift);
  const href = scope === "year" ? "/year" : "/month";
  const [eyebrow, heading] = period.title.split(" — ");
  const label = shift === -1 ? (scope === "year" ? "Last year" : "Last month") : eyebrow;

  return (
    <div className="flex h-full flex-col">
      {/* Opening a neighbouring period moves the plan onto it, so the tab it
          leads to shows that period rather than snapping back. */}
      <Link href={href} onClick={shift ? pin : undefined} className="block">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span
              className={`block text-xs font-medium tracking-[0.14em] uppercase ${
                shift ? "text-faint" : "text-accentink"
              }`}
            >
              {label}
            </span>
            <span className="block text-2xl font-semibold tracking-tight">{heading}</span>
          </span>
          <ArrowUpRight size={17} className="mt-1.5 shrink-0 text-faint" />
        </span>
        <span className="block truncate text-sm text-faint">
          {trail.join("  ›  ") || "Life Plan"}
        </span>
      </Link>
      <div className="mt-3 flex-1">
        <OutlineList
          meta={meta}
          noteKey={noteKey}
          empty="Nothing written yet — open it to start."
        />
      </div>
      {!!meta?.images && (
        <span className="mt-2.5 flex items-center gap-1.5 text-sm text-faint">
          <ImageIcon size={13} /> {meta.images} picture{meta.images === 1 ? "" : "s"}
        </span>
      )}
    </div>
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
      {/* One to a line: wrapped, they ran together and read as one block. */}
      <div className="mt-3 flex flex-col items-start gap-1.5">
        {areas.map((a) => (
          <span
            key={a.id}
            className="max-w-full truncate rounded-full px-3 py-1.5 text-sm leading-tight"
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
    .slice(0, 2) as [string, NoteMeta][];
  return (
    <div className="flex h-full flex-col">
      <Link href="/notes" className="flex items-baseline justify-between gap-2">
        <span className="text-base font-medium">Recent pages</span>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </Link>
      {recent.length === 0 ? (
        <p className="mt-3 text-base text-faint">Nothing written yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {recent.map(([key, meta]) => (
            <OutlineList key={key} meta={meta} noteKey={key} limit={3} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

/** The long horizon: what should be true by when, soonest first. */
function LifeGoalsWidget() {
  const goals = usePlan((s) => s.goals);
  const notes = usePlan((s) => s.notes);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const updateGoal = usePlan((s) => s.updateGoal);
  const ageNow = new Date().getFullYear() - calendarYear(birthDate, 0);
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => [...goals].sort(byTargetAge), [goals]);
  const shown = expanded ? sorted : sorted.slice(0, 4);

  return (
    <div className="flex h-full flex-col">
      <Link href="/goals" className="flex items-baseline justify-between gap-2">
        <span className="text-base font-medium">Life goals</span>
        <ArrowUpRight size={17} className="shrink-0 text-faint" />
      </Link>

      {shown.length === 0 ? (
        <p className="mt-3 text-base text-faint">Nothing set yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((goal) => {
            const away = goal.targetAge - ageNow;
            return (
              <li key={goal.id} className="flex items-start gap-2.5">
                <button
                  onClick={() => updateGoal(goal.id, { done: !goal.done })}
                  aria-pressed={goal.done}
                  aria-label={`${goal.done ? "Untick" : "Tick"} ${goal.title || "this goal"}`}
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                    goal.done
                      ? "border-transparent bg-done text-white"
                      : "border-edge2 text-transparent hover:border-accent"
                  }`}
                >
                  <Check size={12} />
                </button>
                <Link
                  href={goal.plan === "house" ? "/house" : "/goals"}
                  className={`min-w-0 flex-1 truncate text-base ${
                    goal.done ? "text-faint line-through" : "text-muted"
                  }`}
                >
                  {goal.title || "Untitled goal"}
                  {notes[goalNoteKey(goal.id)] && <span className="text-faint"> ·</span>}
                </Link>
                <span className="shrink-0 text-sm text-faint tabular-nums">
                  {away > 0 ? `${away}y` : away === 0 ? "now" : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {sorted.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-start text-sm text-faint transition hover:text-fg"
        >
          {expanded ? "Show less" : `+${sorted.length - 4} more`}
        </button>
      )}
    </div>
  );
}

/** What is due, soonest first, with anything overdue called out. */
function RemindersWidget() {
  const reminders = usePlan((s) => s.reminders);
  const updateReminder = usePlan((s) => s.updateReminder);
  const [expanded, setExpanded] = useState(false);
  const outstanding = useMemo(() => [...reminders].filter((r) => !r.done).sort(byDue), [reminders]);
  const due = expanded ? outstanding : outstanding.slice(0, 4);
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

      {outstanding.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-start text-sm text-faint transition hover:text-fg"
        >
          {expanded ? "Show less" : `+${outstanding.length - 4} more`}
        </button>
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
