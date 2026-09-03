"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImageIcon, NotebookPen } from "lucide-react";
import { weekNoteKey } from "@/lib/notes";
import { usePlan } from "@/lib/store";
import { WEEKS_PER_YEAR, currentCell, formatRange, weekKey } from "@/lib/weeks";
import { NoteSheet } from "./NoteSheet";

const CELL = 13;
const GAP = 2;
const GUTTER = 36;

export function WeeksGrid() {
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const weeks = usePlan((s) => s.weeks);
  const notes = usePlan((s) => s.notes);
  const setWeekDone = usePlan((s) => s.setWeekDone);

  const [selected, setSelected] = useState<{
    age: number;
    week: number;
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const now = currentCell(birthDate);
  const rowRef = useRef<HTMLDivElement>(null);

  // Open on the week the user is actually living in.
  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const ages = Array.from({ length: lifespan + 1 }, (_, i) => i);
  const cols = Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i);
  const entry = selected ? weeks[weekKey(selected.age, selected.week)] : undefined;
  const meta = selected ? notes[weekNoteKey(selected.age, selected.week)] : undefined;

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Outside the scroller, so the key stays put as the grid moves. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4 pb-3 text-xs text-faint sm:px-6">
          <span className="font-medium text-muted">
            Rows: age 0 – {lifespan} · Columns: weeks 1 – {WEEKS_PER_YEAR}
          </span>
          <Key className="bg-cellpast" label="Lived" />
          <Key className="bg-accent" label="Has a goal" />
          <Key className="bg-done" label="Done" />
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
              return (
                <div
                  key={age}
                  ref={isNow ? rowRef : undefined}
                  className="flex items-center"
                  style={{ gap: GAP, marginBottom: GAP }}
                >
                  <div
                    style={{ width: GUTTER }}
                    className={`pr-2 text-right text-[10px] leading-none ${
                      isNow ? "font-semibold text-accentink" : "text-faint"
                    }`}
                  >
                    {age % 5 === 0 || isNow ? age : ""}
                  </div>
                  {cols.map((w) => {
                    const e = weeks[weekKey(age, w)];
                    const noted = !!notes[weekNoteKey(age, w)];
                    const lived = age < now.age || (age === now.age && w < now.week);
                    const here = age === now.age && w === now.week;
                    const active = selected?.age === age && selected?.week === w;
                    return (
                      <button
                        key={w}
                        onClick={() => setSelected({ age, week: w })}
                        title={`Age ${age}, week ${w + 1}`}
                        aria-label={`Age ${age}, week ${w + 1}`}
                        style={{ width: CELL, height: CELL }}
                        className={`rounded-[2px] transition ${
                          e?.done
                            ? "bg-done"
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

      <aside className="shrink-0 border-b border-edge px-4 py-4 sm:px-6 lg:w-80 lg:border-b-0 lg:border-l">
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
              <span className="mt-1.5 line-clamp-4 block text-sm text-muted">
                {meta?.excerpt || (meta?.images ? "" : "What is this week for?")}
              </span>
            </button>

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
      </aside>

      {selected && notesOpen && (
        <NoteSheet
          noteKey={weekNoteKey(selected.age, selected.week)}
          title={`Age ${selected.age} · Week ${selected.week + 1}`}
          subtitle={formatRange(birthDate, selected.age, selected.week)}
          placeholder="What is this week for?"
          onClose={() => setNotesOpen(false)}
        />
      )}
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
