"use client";

import { useState } from "react";
import { ChevronLeft, Grid3x3, ImageIcon, Maximize2, NotebookPen } from "lucide-react";
import { emptyBlueprint, starterTable } from "@/lib/blueprint";
import { usePlan } from "@/lib/store";
import { BlueprintSheet, BlueprintThumb } from "./Blueprint";
import { NoteEditor } from "./NoteEditor";
import { NoteSheet } from "./NoteSheet";
import type { NoteMeta } from "@/lib/types";

/**
 * The writing panel every screen with a page behind it uses. It sits down the
 * left rather than under the screen, so opening it takes width — of which
 * there is usually some to spare — instead of height, which is what made the
 * bubbles shrink. Closed it is a rail; open it is the page itself, edited in
 * place, with the full sheet and its pictures one button further.
 */
export function NotesPanel({
  noteKey,
  title,
  subtitle,
  placeholder = "Write, paste a screenshot, drop in a picture…",
  meta,
  open,
  onOpenChange,
  hint = "Pick something to write about.",
  grid = false,
}: {
  /** Null when the screen has nothing selected to write about yet. */
  noteKey: string | null;
  title: string;
  subtitle?: string;
  placeholder?: string;
  meta?: NoteMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hint?: string;
  /** Whether this page can also carry a grid page — a drawing to scale. */
  grid?: boolean;
}) {
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<"notes" | "grid">("notes");
  const [plan, setPlan] = useState(false);
  const blueprint = usePlan((s) => (noteKey ? s.blueprints[noteKey] : undefined));
  const setBlueprint = usePlan((s) => s.setBlueprint);

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        title={`Notes — ${title}`}
        aria-label={`Open the notes for ${title}`}
        className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-edge py-3 text-muted transition hover:bg-surface hover:text-fg"
      >
        <NotebookPen size={16} className="shrink-0" />
        <span className="text-xs tracking-wide [writing-mode:vertical-rl]">Notes</span>
        {(!!meta || !!blueprint) && (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col border-r border-edge bg-surface lg:w-[26rem]">
      <div className="flex shrink-0 items-center gap-2 border-b border-edge px-3 py-2">
        <NotebookPen size={15} className="shrink-0 text-accentink" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          {subtitle && <span className="block truncate text-xs text-faint">{subtitle}</span>}
        </span>
        {!!meta?.images && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-faint">
            <ImageIcon size={13} /> {meta.images}
          </span>
        )}
        {noteKey && (
          <button
            onClick={() => setSheet(true)}
            aria-label="Open the full page"
            title="Open the full page, with pictures"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <Maximize2 size={15} />
          </button>
        )}
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close the notes"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {grid && noteKey && (
        <div className="flex shrink-0 gap-1 border-b border-edge px-2 py-1.5">
          {(["notes", "grid"] as const).map((which) => (
            <button
              key={which}
              onClick={() => setTab(which)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                tab === which
                  ? "bg-accentsoft text-accentink"
                  : "text-muted hover:bg-surface2 hover:text-fg"
              }`}
            >
              {which === "notes" ? <NotebookPen size={13} /> : <Grid3x3 size={13} />}
              {which === "notes" ? "Notes" : "Grid page"}
            </button>
          ))}
        </div>
      )}

      {!noteKey ? (
        <p className="px-4 py-5 text-sm text-faint">{hint}</p>
      ) : grid && tab === "grid" ? (
        <div className="overflow-y-auto p-3">
          {blueprint ? (
            <>
              <button
                onClick={() => setPlan(true)}
                className="block w-full text-left"
                aria-label="Open the grid page"
              >
                <BlueprintThumb bp={blueprint} />
              </button>
              <p className="mt-2 text-sm font-medium">{blueprint.title}</p>
              <p className="text-xs text-faint">
                {blueprint.parts.length} part{blueprint.parts.length === 1 ? "" : "s"} ·{" "}
                {blueprint.width} × {blueprint.height} {blueprint.unit}
              </p>
              <button
                onClick={() => setPlan(true)}
                className="mt-3 w-full rounded-xl border border-edge bg-surface2 px-3 py-2 text-sm text-muted transition hover:text-fg"
              >
                Open the plan
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                A page of graph paper: parts drawn to scale, with their dimensions and a legend of
                what they are made of.
              </p>
              <button
                onClick={() => setBlueprint(noteKey, starterTable(title))}
                className="w-full rounded-xl border border-transparent bg-accent px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                Start from a table
              </button>
              <button
                onClick={() => setBlueprint(noteKey, emptyBlueprint(title))}
                className="w-full rounded-xl border border-edge bg-surface2 px-3 py-2 text-sm text-muted transition hover:text-fg"
              >
                Start from an empty sheet
              </button>
            </div>
          )}
        </div>
      ) : (
        <NoteEditor noteKey={noteKey} placeholder={placeholder} />
      )}

      {noteKey && plan && <BlueprintSheet noteKey={noteKey} onClose={() => setPlan(false)} />}

      {noteKey && sheet && (
        <NoteSheet
          noteKey={noteKey}
          title={title}
          subtitle={subtitle}
          placeholder={placeholder}
          onClose={() => setSheet(false)}
        />
      )}
    </aside>
  );
}
