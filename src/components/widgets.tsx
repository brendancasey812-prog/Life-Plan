"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Cake,
  Compass,
  ImageIcon,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";
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
  bubbles: { label: "My Life bubbles", hint: "Into the decades", icon: Sparkles },
  lifeMap: { label: "Life Map", hint: "The areas you build around", icon: Compass },
  recentNotes: { label: "Recent pages", hint: "What you wrote last", icon: NotebookPen },
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
        <span className="text-6xl leading-none font-semibold tracking-tight tabular-nums sm:text-7xl">
          {age}
        </span>
        <span className="text-sm text-muted">
          years old
          {name ? <span className="block text-faint">{name}</span> : null}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-xs text-muted">
          <span>
            Week {week + 1} of your {ordinal(age + 1)} year
          </span>
          <span className="tabular-nums">{through}%</span>
        </div>
        <Meter value={through} />
        <p className="mt-2 text-xs text-faint">
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
      <p className="text-xs tracking-[0.14em] text-faint uppercase">
        {now.toLocaleDateString(undefined, { weekday: "long" })}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {MONTHS[now.getMonth()]} {now.getDate()}
      </p>
      <p className="text-lg text-muted tabular-nums">{now.getFullYear()}</p>
      <p className="mt-2 text-xs text-faint">Week {week + 1} of this year of your life</p>
    </div>
  );
}

/** The same page the goal tab and the bubble open — not a copy of it. */
function GoalWidget({ scope }: { scope: Scope }) {
  const { period, meta, trail } = useGoalPage(scope);
  const href = scope === "year" ? "/year" : "/month";
  const [eyebrow, heading] = period.title.split(" — ");

  return (
    <Link href={href} className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-accentink uppercase">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold tracking-tight">{heading}</h3>
        </div>
        <ArrowUpRight size={15} className="mt-1 shrink-0 text-faint" />
      </div>
      <p className="truncate text-xs text-faint">{trail.join("  ›  ") || "My Life"}</p>
      <p className="mt-2.5 line-clamp-4 flex-1 text-sm text-muted">
        {meta?.excerpt || (meta?.images ? "" : "Nothing written yet — open it to start.")}
      </p>
      {!!meta?.images && (
        <span className="mt-2 flex items-center gap-1.5 text-xs text-faint">
          <ImageIcon size={13} /> {meta.images} picture{meta.images === 1 ? "" : "s"}
        </span>
      )}
    </Link>
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
        <h3 className="text-sm font-medium">Weeks lived</h3>
        <ArrowUpRight size={15} className="shrink-0 text-faint" />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {lived.toLocaleString()}
        <span className="text-base font-normal text-faint"> / {total.toLocaleString()}</span>
      </p>
      <Meter value={pct} />
      <p className="mt-2 text-xs text-faint">
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
        <h3 className="text-sm font-medium">My Life</h3>
        <ArrowUpRight size={15} className="shrink-0 text-faint" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: 34 - i * 6,
              height: 34 - i * 6,
              background: `hsl(${190 + i * 26} var(--b-on-s) var(--b-on-l1) / var(--b-on-a))`,
            }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-faint">
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
        <h3 className="text-sm font-medium">Life Map</h3>
        <ArrowUpRight size={15} className="shrink-0 text-faint" />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {areas.map((a) => (
          <span
            key={a.id}
            className="rounded-full px-2.5 py-1 text-xs"
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
        <h3 className="text-sm font-medium">Recent pages</h3>
        <ArrowUpRight size={15} className="shrink-0 text-faint" />
      </div>
      {recent.length === 0 ? (
        <p className="mt-2.5 text-sm text-faint">Nothing written yet.</p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {recent.map(([key, meta]) => (
            <li key={key} className="truncate text-sm text-muted">
              {meta.excerpt || "A page of pictures"}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <div
      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface3"
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
