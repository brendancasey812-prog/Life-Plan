"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, NotebookPen, Plus, Target, Trash2 } from "lucide-react";
import { useGoHome } from "@/lib/goHome";
import { goalNoteKey } from "@/lib/house";
import { byTargetAge, usePlan } from "@/lib/store";
import { calendarYear } from "@/lib/weeks";
import { NoteSheet } from "./NoteSheet";
import { OutlineList } from "./OutlineList";

/** The tab the ages of the plan are aimed at: what should be true by when. */
export function LifeGoals() {
  const goals = usePlan((s) => s.goals);
  const notes = usePlan((s) => s.notes);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const addGoal = usePlan((s) => s.addGoal);
  const updateGoal = usePlan((s) => s.updateGoal);
  const deleteGoal = usePlan((s) => s.deleteGoal);

  const [openId, setOpenId] = useState<string | null>(null);
  const pathname = usePathname();
  useGoHome(pathname, () => setOpenId(null));

  const sorted = [...goals].sort(byTargetAge);
  const open = goals.find((g) => g.id === openId);
  const birthYear = calendarYear(birthDate, 0);
  const ageNow = new Date().getFullYear() - birthYear;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Life Goals</h1>
            <p className="mt-1 text-sm text-muted">
              What should be true by when. Each one shows on the age it is aimed at.
            </p>
          </div>
          <button
            onClick={() => setOpenId(addGoal("", Math.min(100, ageNow + 5)))}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <Plus size={15} /> Add a goal
          </button>
        </header>

        <ul className="mt-5 space-y-3">
          {sorted.length === 0 && (
            <li className="rounded-2xl border border-dashed border-edge2 px-4 py-8 text-center text-sm text-faint">
              Nothing set yet.
            </li>
          )}
          {sorted.map((goal) => {
            const key = goalNoteKey(goal.id);
            const away = goal.targetAge - ageNow;
            return (
              <li
                key={goal.id}
                className="pane rounded-2xl border border-edge bg-surface p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateGoal(goal.id, { done: !goal.done })}
                    aria-pressed={goal.done}
                    aria-label={`${goal.done ? "Not done" : "Done"}: ${goal.title || "Untitled goal"}`}
                    className={`mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                      goal.done
                        ? "border-transparent bg-done text-white"
                        : "border-edge2 text-transparent hover:border-accent"
                    }`}
                  >
                    <Check size={12} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <input
                      value={goal.title}
                      onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                      placeholder="What should be true?"
                      aria-label="Goal"
                      className={`w-full bg-transparent text-lg font-medium tracking-tight outline-none placeholder:text-faint ${
                        goal.done ? "text-faint line-through" : ""
                      }`}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-faint">
                      <label className="flex items-center gap-1.5">
                        by age
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={goal.targetAge}
                          onChange={(e) =>
                            updateGoal(goal.id, { targetAge: Number(e.target.value) || 0 })
                          }
                          aria-label="Target age"
                          className="w-14 rounded-lg border border-edge bg-surface2 px-2 py-0.5 text-center tabular-nums outline-none focus:border-accent"
                        />
                        <span className="tabular-nums">
                          · {calendarYear(birthDate, goal.targetAge)}
                        </span>
                      </label>
                      <span className="tabular-nums">
                        {away > 0 ? `${away} years away` : away === 0 ? "this year" : "past"}
                      </span>
                      {goal.plan === "house" && (
                        <Link
                          href="/house"
                          className="flex items-center gap-1 text-accentink hover:underline"
                        >
                          <Target size={13} /> Work the numbers <ArrowUpRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setOpenId(goal.id)}
                    aria-label={`Notes for ${goal.title || "this goal"}`}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
                  >
                    <NotebookPen size={16} />
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    aria-label={`Delete ${goal.title || "this goal"}`}
                    className="rounded-lg p-1.5 text-faint transition hover:bg-dangersoft hover:text-dangerink"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <OutlineList
                  meta={notes[key]}
                  noteKey={key}
                  limit={4}
                  size="sm"
                  className="mt-2 pl-[30px]"
                />
              </li>
            );
          })}
        </ul>
      </div>

      {open && (
        <NoteSheet
          noteKey={goalNoteKey(open.id)}
          title={open.title || "Untitled goal"}
          subtitle={`By age ${open.targetAge} · ${calendarYear(birthDate, open.targetAge)}`}
          placeholder="What has to happen for this to be true?"
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
