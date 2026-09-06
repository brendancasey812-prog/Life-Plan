"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ImageIcon, Plus, Search } from "lucide-react";
import { useGoHome } from "@/lib/goHome";
import { deleteNotes } from "@/lib/notes";
import { byDue, dueLabel, reminderNoteKey, reminderTitle, type DueTone } from "@/lib/reminders";
import { usePlan } from "@/lib/store";
import { NoteSheet } from "./NoteSheet";

const TONE: Record<DueTone, string> = {
  overdue: "text-dangerink",
  today: "text-accentink font-medium",
  soon: "text-muted",
  later: "text-faint",
  none: "text-faint",
};

/** The same shape as the Notes tab: search, add, a grid, and a page behind each. */
export function Reminders() {
  const reminders = usePlan((s) => s.reminders);
  const notes = usePlan((s) => s.notes);
  const addReminder = usePlan((s) => s.addReminder);
  const updateReminder = usePlan((s) => s.updateReminder);
  const deleteReminder = usePlan((s) => s.deleteReminder);

  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  useGoHome(pathname, () => {
    setQuery("");
    setOpenId(null);
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  });

  const sorted = useMemo(() => [...reminders].sort(byDue), [reminders]);
  const q = query.trim().toLowerCase();
  const shown = q
    ? sorted.filter((r) =>
        `${r.title} ${notes[reminderNoteKey(r.id)]?.excerpt ?? ""}`.toLowerCase().includes(q),
      )
    : sorted;

  const open = reminders.find((r) => r.id === openId);
  const outstanding = reminders.filter((r) => !r.done).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 px-4 py-4 sm:px-6">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reminders…"
            className="w-full rounded-xl border border-edge bg-surface py-2.5 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setOpenId(addReminder(""))}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus size={16} /> New reminder
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-faint">
            {q ? "Nothing matches that." : "Nothing to remember yet."}
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-faint">
              {outstanding} outstanding · {reminders.length - outstanding} done
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => {
                const meta = notes[reminderNoteKey(r.id)];
                const due = dueLabel(r.due);
                return (
                  <li
                    key={r.id}
                    className={`pane flex items-start gap-3 rounded-xl border border-edge bg-surface p-4 transition hover:border-edge2 hover:bg-surface2 ${
                      r.done ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => updateReminder(r.id, { done: !r.done })}
                      aria-label={
                        r.done
                          ? `Mark ${reminderTitle(r.title)} not done`
                          : `Mark ${reminderTitle(r.title)} done`
                      }
                      aria-pressed={r.done}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        r.done
                          ? "border-transparent bg-done text-white"
                          : "border-edge2 text-transparent hover:border-accent"
                      }`}
                    >
                      <Check size={13} />
                    </button>

                    <button onClick={() => setOpenId(r.id)} className="min-w-0 flex-1 text-left">
                      <span
                        className={`block truncate text-sm font-medium ${r.done ? "line-through" : ""}`}
                      >
                        {reminderTitle(r.title)}
                      </span>
                      <span className={`mt-0.5 flex items-center gap-2 text-xs ${TONE[due.tone]}`}>
                        {r.done ? "Done" : due.text}
                        {!!meta?.images && (
                          <span className="flex items-center gap-1 text-faint">
                            <ImageIcon size={12} /> {meta.images}
                          </span>
                        )}
                      </span>
                      {meta?.excerpt && (
                        <span className="mt-1.5 line-clamp-2 block text-sm text-muted">
                          {meta.excerpt}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {open && (
        <NoteSheet
          noteKey={reminderNoteKey(open.id)}
          title={open.title}
          placeholder="What is this about? Notes, screenshots, links…"
          onRename={(title) => updateReminder(open.id, { title })}
          onDelete={() => {
            deleteReminder(open.id);
            void deleteNotes([reminderNoteKey(open.id)]);
          }}
          onClose={() => setOpenId(null)}
          extra={
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-faint">
                Due
                <input
                  type="date"
                  value={open.due}
                  onChange={(e) => updateReminder(open.id, { due: e.target.value })}
                  className="rounded-lg border border-edge bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent"
                />
              </label>
              <button
                onClick={() => updateReminder(open.id, { done: !open.done })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition ${
                  open.done
                    ? "bg-done text-white hover:brightness-110"
                    : "border border-edge text-muted hover:bg-surface2 hover:text-fg"
                }`}
              >
                <Check size={12} /> {open.done ? "Done" : "Mark done"}
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
