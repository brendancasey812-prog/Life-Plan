"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, Flag, ImageIcon, NotebookPen, X } from "lucide-react";
import { useGoHome } from "@/lib/goHome";
import { bubbleNoteKey, weekNoteKey } from "@/lib/notes";
import { byTargetAge, usePlan } from "@/lib/store";
import { WEEKS_PER_YEAR, calendarYear, currentCell, formatRange, weekKey } from "@/lib/weeks";
import { NotesPanel } from "./NotesPanel";
import { OutlineList } from "./OutlineList";
import { WeeklyGoals } from "./WeeklyGoals";

const CELL = 13;
const GAP = 2;
const GUTTER = 36;

export function WeeksGrid() {
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const weeks = usePlan((s) => s.weeks);
  const notes = usePlan((s) => s.notes);
  const setWeekDone = usePlan((s) => s.setWeekDone);
  const lifeGoals = usePlan((s) => s.goals);
  const tree = usePlan((s) => s.trees.life);
  const setFocus = usePlan((s) => s.setFocus);

  const [selected, setSelected] = useState<{
    age: number;
    week: number;
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  /** The drop-out over a week or a year that carries a goal, and where. */
  const [popped, setPopped] = useState<{ age: number; week?: number; x: number; y: number } | null>(
    null,
  );
  const now = currentCell(birthDate);
  const rowRef = useRef<HTMLDivElement>(null);

  // Open on the week the user is actually living in.
  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const pathname = usePathname();
  useGoHome(pathname, () => {
    setSelected(null);
    setNotesOpen(false);
    setPopped(null);
    rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  // The `Age N` bubble's page is the year's goals, and it is the same page the
  // Yearly Goals tab opens — so the pop-out can link to either.
  const yearPages = useMemo(() => {
    const out: Record<number, string> = {};
    for (const node of Object.values(tree.nodes)) {
      if (node.month === undefined && node.ageFrom !== undefined && node.ageFrom === node.ageTo) {
        out[node.ageFrom] = bubbleNoteKey("life", node.id);
      }
    }
    return out;
  }, [tree]);

  const hasGoal = (age: number, week: number) => !!notes[weekNoteKey(age, week)];
  const yearHasGoal = (age: number) =>
    !!notes[yearPages[age] ?? ""] || lifeGoals.some((g) => g.targetAge === age);

  const ages = Array.from({ length: lifespan + 1 }, (_, i) => i);
  const cols = Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i);
  const entry = selected ? weeks[weekKey(selected.age, selected.week)] : undefined;
  const meta = selected ? notes[weekNoteKey(selected.age, selected.week)] : undefined;

  return (
    <div className="flex h-full">
      <NotesPanel
        noteKey={selected ? weekNoteKey(selected.age, selected.week) : null}
        title={selected ? `Age ${selected.age} · Week ${selected.week + 1}` : "Notes"}
        subtitle={selected ? formatRange(birthDate, selected.age, selected.week) : undefined}
        placeholder="What is this week for?"
        meta={meta}
        open={notesOpen}
        onOpenChange={setNotesOpen}
        hint="Pick a week to write about it."
      />

      <div
        className={`min-h-0 flex-1 flex-col-reverse lg:flex-row ${
          notesOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Outside the scroller, so the key stays put as the grid moves. */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4 pb-3 text-xs text-faint sm:px-6">
            <span className="font-medium text-muted">
              Rows: age 0 – {lifespan} · Columns: weeks 1 – {WEEKS_PER_YEAR}
            </span>
            <Key className="bg-cellpast" label="Lived" />
            <Key className="bg-accent" label="Has a goal" />
            <Key className="bg-celldone" label="Done" />
            <span className="flex items-center gap-1.5 text-accentink">
              <Flag size={10} /> Milestone year
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6">
            <div className="inline-block">
              <div className="mb-1 flex gap-[2px]" style={{ paddingLeft: GUTTER }}>
                {cols.map((w) => (
                  <div
                    key={w}
                    style={{ width: CELL }}
                    className="text-center text-[8px] leading-none text-faint"
                  >
                    {w % 4 === 0 ? w + 1 : ""}
                  </div>
                ))}
              </div>

              {ages.map((age) => {
                const isNow = age === now.age;
                const marked = yearHasGoal(age);
                return (
                  <div
                    key={age}
                    ref={isNow ? rowRef : undefined}
                    className={`flex items-center ${marked ? "rounded-sm bg-accentsoft" : ""}`}
                    style={{ gap: GAP, marginBottom: GAP }}
                  >
                    {/* A year carrying something is marked rather than left to
                        be found: the flag says there is a milestone on it, the
                        click says what. */}
                    <button
                      style={{ width: GUTTER }}
                      onClick={(e) =>
                        setPopped(
                          marked
                            ? {
                                age,
                                x: e.clientX,
                                y: e.currentTarget.getBoundingClientRect().bottom,
                              }
                            : null,
                        )
                      }
                      aria-label={marked ? `Age ${age} — what this year holds` : `Age ${age}`}
                      className={`flex items-center justify-end gap-0.5 pr-1.5 text-[10px] leading-none transition ${
                        marked
                          ? "font-semibold text-accentink hover:brightness-110"
                          : isNow
                            ? "font-semibold text-accentink"
                            : "text-faint"
                      }`}
                    >
                      {marked && <Flag size={9} className="shrink-0" />}
                      {age % 5 === 0 || isNow || marked ? age : ""}
                    </button>
                    {cols.map((w) => {
                      const e = weeks[weekKey(age, w)];
                      const noted = !!notes[weekNoteKey(age, w)];
                      const lived = age < now.age || (age === now.age && w < now.week);
                      const here = age === now.age && w === now.week;
                      const active = selected?.age === age && selected?.week === w;
                      return (
                        <button
                          key={w}
                          onClick={(event) => {
                            setSelected({ age, week: w });
                            const box = event.currentTarget.getBoundingClientRect();
                            setPopped(
                              hasGoal(age, w) ? { age, week: w, x: box.left, y: box.bottom } : null,
                            );
                          }}
                          title={`Age ${age}, week ${w + 1}`}
                          aria-label={`Age ${age}, week ${w + 1}`}
                          style={{ width: CELL, height: CELL }}
                          className={`rounded-[2px] transition ${
                            e?.done
                              ? "bg-celldone"
                              : noted
                                ? "bg-accent"
                                : lived
                                  ? "bg-cellpast"
                                  : "bg-cell"
                          } ${here ? "ring-2 ring-accent" : ""} ${
                            active ? "ring-2 ring-fg" : "hover:bg-cellhover"
                          }`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="shrink-0 space-y-4 overflow-y-auto border-b border-edge px-4 py-4 sm:px-6 lg:w-80 lg:border-b-0 lg:border-l">
          {!selected ? (
            <p className="text-sm text-faint">
              Pick any week to write down what it is for. You are in age {now.age}, week{" "}
              {now.week + 1}.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Age {selected.age} · Week {selected.week + 1}
                </h2>
                <p className="text-xs text-faint">
                  {formatRange(birthDate, selected.age, selected.week)}
                </p>
              </div>

              <button
                onClick={() => setNotesOpen(true)}
                className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition hover:bg-surface2"
              >
                <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-accentink uppercase">
                  <NotebookPen size={14} /> Notes
                  {!!meta?.images && (
                    <span className="ml-auto flex items-center gap-1 text-faint normal-case">
                      <ImageIcon size={12} /> {meta.images}
                    </span>
                  )}
                </span>
              </button>
              <OutlineList
                meta={meta}
                noteKey={weekNoteKey(selected.age, selected.week)}
                limit={4}
                size="sm"
                empty="What is this week for?"
                className="px-3"
              />

              <button
                onClick={() => setWeekDone(selected.age, selected.week, !entry?.done)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  entry?.done
                    ? "bg-done text-white hover:brightness-110"
                    : "border border-edge text-muted hover:bg-surface2"
                }`}
              >
                <Check size={15} /> {entry?.done ? "Done" : "Mark done"}
              </button>
            </div>
          )}

          {/* Not this week's — the standing list, beside whichever week is open. */}
          <div className="border-t border-edge pt-4">
            <WeeklyGoals size="sm" limit={8} />
          </div>
        </aside>
      </div>

      {popped && (
        <GoalPopout
          age={popped.age}
          week={popped.week}
          at={{ x: popped.x, y: popped.y }}
          birthDate={birthDate}
          weekKeyFor={weekNoteKey}
          yearKey={yearPages[popped.age]}
          goals={[...lifeGoals].filter((g) => g.targetAge === popped.age).sort(byTargetAge)}
          onOpenNotes={() => {
            if (popped.week !== undefined) setSelected({ age: popped.age, week: popped.week });
            setNotesOpen(true);
            setPopped(null);
          }}
          onYear={() => {
            setFocus("year", { year: calendarYear(birthDate, popped.age) });
            setPopped(null);
          }}
          onClose={() => setPopped(null)}
        />
      )}
    </div>
  );
}

/**
 * What a week or a year holds, and where the rest of it lives. It is the same
 * page underneath, so a line ticked here is ticked wherever else it shows.
 */
function GoalPopout({
  age,
  week,
  at,
  birthDate,
  weekKeyFor,
  yearKey,
  goals,
  onOpenNotes,
  onYear,
  onClose,
}: {
  age: number;
  week?: number;
  /** Where on screen it was opened from, so it lands beside it. */
  at: { x: number; y: number };
  birthDate: string;
  weekKeyFor: (age: number, week: number) => string;
  yearKey?: string;
  goals: { id: string; title: string; plan?: "house" }[];
  onOpenNotes: () => void;
  onYear: () => void;
  onClose: () => void;
}) {
  const notes = usePlan((s) => s.notes);
  const card = useRef<HTMLDivElement>(null);
  const key = week === undefined ? yearKey : weekKeyFor(age, week);
  const year = calendarYear(birthDate, age);

  // It sits over the grid rather than over the screen: anything outside it
  // still takes the click that closes it, so the panel beside it stays usable.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!card.current?.contains(e.target as Node)) onClose();
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  const width = 320;
  const left = Math.max(8, Math.min(at.x, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(at.y + 6, window.innerHeight - 300));

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ pointerEvents: "none" }}>
      <div
        ref={card}
        style={{ left, top, width, pointerEvents: "auto" }}
        className="pane absolute rounded-2xl border border-edge bg-sheet p-4 shadow-2xl"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight">
              {week === undefined ? `Age ${age}` : `Age ${age} · Week ${week + 1}`}
            </h3>
            <p className="text-xs text-faint">
              {week === undefined ? year : formatRange(birthDate, age, week)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>

        <OutlineList
          meta={key ? notes[key] : undefined}
          noteKey={key ?? null}
          limit={5}
          size="sm"
          empty="Nothing written on it yet."
          className="mt-3"
        />

        {goals.length > 0 && (
          <div className="mt-3 border-t border-edge pt-3">
            <p className="text-xs tracking-[0.14em] text-faint uppercase">Life goals</p>
            <ul className="mt-1.5 space-y-1">
              {goals.map((goal) => (
                <li key={goal.id}>
                  <Link
                    href={goal.plan === "house" ? "/house" : "/goals"}
                    onClick={onClose}
                    className="flex items-center gap-1 text-sm text-accentink hover:underline"
                  >
                    {goal.title || "Untitled goal"} <ArrowUpRight size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onOpenNotes}
            className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
          >
            {week === undefined ? "Open the notes" : "Write on this week"}
          </button>
          <Link
            href="/year"
            onClick={onYear}
            className="flex items-center gap-1 rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
          >
            Yearly Goals — {year} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${className}`} />
      {label}
    </span>
  );
}
