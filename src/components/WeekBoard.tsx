"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ListTree,
  RotateCcw,
} from "lucide-react";
import { calendarWeekKey, mondayOf, stepWeek, weekLabel } from "@/lib/calendarWeek";
import { useGoHome } from "@/lib/goHome";
import { usePlan } from "@/lib/store";
import { NoteEditor } from "./NoteEditor";
import { NoteGallery } from "./NoteGallery";

/**
 * This week's goals: a page per calendar week, Monday to Sunday. Not the
 * standing list that comes round every week, and not the 52-cell grid either,
 * whose weeks start on the weekday the user was born — this is the week as a
 * diary keeps it, so "the week of 12 October" means what it says.
 */
export function WeekBoard() {
  const focused = usePlan((s) => s.focus.week);
  const setWeekFocus = usePlan((s) => s.setWeekFocus);
  const map = usePlan((s) => s.trees.map);
  const [layout, setLayout] = useState(0);

  const thisWeek = mondayOf();
  const monday = focused ?? thisWeek;
  const noteKey = calendarWeekKey(monday);
  const isThisWeek = monday === thisWeek;

  const pathname = usePathname();
  useGoHome(pathname, () => setWeekFocus(null));

  const headings = useMemo(() => {
    const areas = (map.nodes[map.rootId]?.childIds ?? [])
      .map((id) => map.nodes[id]?.label)
      .filter((label): label is string => !!label);
    return [...areas, "Miscellaneous"];
  }, [map]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="pane relative overflow-hidden rounded-2xl border border-edge px-5 py-5 sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 140% at 0% 0%, rgba(99,102,241,0.22), transparent 62%), radial-gradient(100% 160% at 100% 0%, rgba(45,212,191,0.14), transparent 60%)",
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] text-accentink uppercase">
              <CalendarRange size={13} /> Weekly goals
            </p>
            {!isThisWeek && (
              <button
                onClick={() => setWeekFocus(null)}
                className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 text-xs text-muted transition hover:bg-surface2 hover:text-fg"
              >
                <RotateCcw size={12} /> This week
              </button>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekFocus(stepWeek(monday, -1))}
                aria-label="Previous week"
                className="rounded-full border border-edge bg-surface p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {weekLabel(monday)}
              </h1>
              <button
                onClick={() => setWeekFocus(stepWeek(monday, 1))}
                aria-label="Next week"
                className="rounded-full border border-edge bg-surface p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={() => setLayout((n) => n + 1)}
              title="Add a heading for each life category, and one for the rest"
              className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs text-muted transition hover:bg-surface2 hover:text-fg"
            >
              <ListTree size={13} className="text-accentink" />
              By category
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className="pane flex min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-edge bg-surface lg:min-h-[34rem]">
            <NoteEditor
              noteKey={noteKey}
              placeholder="What has to happen this week?"
              sections={{ names: headings, token: layout }}
            />
          </section>

          <section className="pane rounded-2xl border border-edge bg-surface p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-muted uppercase">
              <ImageIcon size={14} className="text-accentink" /> Pictures
            </h2>
            <p className="mt-1 mb-4 text-xs text-faint">Anything this week is about.</p>
            <NoteGallery noteKey={noteKey} />
          </section>
        </div>
      </div>
    </div>
  );
}
