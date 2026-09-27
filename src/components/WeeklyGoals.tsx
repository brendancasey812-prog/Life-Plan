"use client";

import { useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { WEEKLY_GOALS_KEY, metaOf, readNote, updateNote } from "@/lib/notes";
import { clearOutlineTicks } from "@/lib/outline";
import { usePlan } from "@/lib/store";
import { NoteSheet } from "./NoteSheet";
import { OutlineList } from "./OutlineList";

const PLACEHOLDER =
  "What should every week hold? One line each — a run, an evening with the guitar, the books…";

/**
 * The standing weekly goals: one list that is not tied to any week, shown on
 * the Overview and beside every week of the grid. A tick here is the same tick
 * everywhere, and Reset clears them all for a fresh week.
 */
export function WeeklyGoals({
  size = "base",
  limit = 6,
  className = "",
}: {
  size?: "sm" | "base";
  limit?: number;
  className?: string;
}) {
  const meta = usePlan((s) => s.notes[WEEKLY_GOALS_KEY]);
  const setNoteMeta = usePlan((s) => s.setNoteMeta);
  const [editing, setEditing] = useState(false);
  const anyDone = !!meta?.outline?.some((item) => item.done);

  async function reset() {
    const body = await readNote(WEEKLY_GOALS_KEY);
    const html = body && clearOutlineTicks(body.html);
    if (!html) return;
    setNoteMeta(WEEKLY_GOALS_KEY, metaOf(await updateNote(WEEKLY_GOALS_KEY, { html })));
  }

  const small = size === "sm";

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3
          className={
            small
              ? "text-xs font-medium tracking-[0.14em] text-muted uppercase"
              : "text-base font-medium"
          }
        >
          Weekly goals
        </h3>
        <span className="flex shrink-0 items-center gap-1">
          {anyDone && (
            <button
              onClick={reset}
              title="Untick everything for a new week"
              className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-faint transition hover:bg-surface2 hover:text-fg"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-accentink transition hover:bg-surface2"
          >
            <Pencil size={12} /> Edit
          </button>
        </span>
      </div>

      <p className={`${small ? "text-xs" : "text-sm"} text-faint`}>
        The same list every week, not just this one.
      </p>

      <div className={small ? "mt-2" : "mt-3 flex-1"}>
        <OutlineList
          meta={meta}
          noteKey={WEEKLY_GOALS_KEY}
          limit={limit}
          size={size}
          empty="Nothing standing yet — Edit to set what every week should hold."
        />
      </div>

      {editing && (
        <NoteSheet
          noteKey={WEEKLY_GOALS_KEY}
          title="Weekly goals"
          subtitle="The same list every week — it is not tied to one"
          placeholder={PLACEHOLDER}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
