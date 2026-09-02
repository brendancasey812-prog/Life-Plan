"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { usePlan } from "@/lib/store";
import { WEEKS_PER_YEAR, currentCell, formatRange, weekKey } from "@/lib/weeks";

const CELL = 13;
const GAP = 2;
const GUTTER = 36;

export function WeeksGrid() {
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const weeks = usePlan((s) => s.weeks);
  const setWeek = usePlan((s) => s.setWeek);

  const [selected, setSelected] = useState<{
    age: number;
    week: number;
  } | null>(null);
  const now = currentCell(birthDate);
  const rowRef = useRef<HTMLDivElement>(null);

  // Open on the week the user is actually living in.
  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const ages = Array.from({ length: lifespan + 1 }, (_, i) => i);
  const cols = Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i);
  const entry = selected ? weeks[weekKey(selected.age, selected.week)] : undefined;

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Outside the scroller, so the key stays put as the grid moves. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4 pb-3 text-xs text-zinc-500 sm:px-6">
          <span className="font-medium text-zinc-400">
            Rows: age 0 – {lifespan} · Columns: weeks 1 – {WEEKS_PER_YEAR}
          </span>
          <Key className="bg-white/25" label="Lived" />
          <Key className="bg-indigo-500/80" label="Has a goal" />
          <Key className="bg-emerald-500/80" label="Done" />
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6">
          <div className="inline-block">
            <div className="mb-1 flex gap-[2px]" style={{ paddingLeft: GUTTER }}>
              {cols.map((w) => (
                <div
                  key={w}
                  style={{ width: CELL }}
                  className="text-center text-[8px] leading-none text-zinc-600"
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
                      isNow ? "font-semibold text-indigo-300" : "text-zinc-600"
                    }`}
                  >
                    {age % 5 === 0 || isNow ? age : ""}
                  </div>
                  {cols.map((w) => {
                    const e = weeks[weekKey(age, w)];
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
                            ? "bg-emerald-500/80"
                            : e
                              ? "bg-indigo-500/80"
                              : lived
                                ? "bg-white/25"
                                : "bg-white/[0.05]"
                        } ${here ? "ring-2 ring-indigo-300" : ""} ${
                          active ? "ring-2 ring-white" : "hover:bg-white/25"
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

      <aside className="shrink-0 border-b border-white/[0.07] px-4 py-4 sm:px-6 lg:w-80 lg:border-b-0 lg:border-l">
        {!selected ? (
          <p className="text-sm text-zinc-500">
            Pick any week to write down what it is for. You are in age {now.age}, week{" "}
            {now.week + 1}.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Age {selected.age} · Week {selected.week + 1}
              </h2>
              <p className="text-xs text-zinc-500">
                {formatRange(birthDate, selected.age, selected.week)}
              </p>
            </div>

            <textarea
              value={entry?.note ?? ""}
              onChange={(e) => setWeek(selected.age, selected.week, { note: e.target.value })}
              rows={6}
              placeholder="What is this week for?"
              className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            />

            <button
              onClick={() => setWeek(selected.age, selected.week, { done: !entry?.done })}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                entry?.done
                  ? "bg-emerald-500/85 text-white hover:bg-emerald-500"
                  : "border border-white/10 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <Check size={15} /> {entry?.done ? "Done" : "Mark done"}
            </button>
          </div>
        )}
      </aside>
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
