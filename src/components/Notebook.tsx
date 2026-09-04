"use client";

import { useMemo, useState } from "react";
import { CalendarRange, FileText, ImageIcon, Plus, Search, Sparkles } from "lucide-react";
import { deleteNotes, pageNoteKey } from "@/lib/notes";
import { pageTitle, usePlan } from "@/lib/store";
import type { NoteMeta, TreeId } from "@/lib/types";
import { formatRange } from "@/lib/weeks";
import { NoteSheet } from "./NoteSheet";

type Kind = "page" | "bubble" | "week";

interface Entry {
  key: string;
  kind: Kind;
  title: string;
  context: string;
  meta?: NoteMeta;
  /** Set for standalone pages, which can be renamed and deleted from here. */
  pageId?: string;
}

const ICON: Record<Kind, typeof FileText> = {
  page: FileText,
  bubble: Sparkles,
  week: CalendarRange,
};

export function Notebook() {
  const pages = usePlan((s) => s.pages);
  const notes = usePlan((s) => s.notes);
  const trees = usePlan((s) => s.trees);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const addPage = usePlan((s) => s.addPage);
  const renamePage = usePlan((s) => s.renamePage);
  const deletePage = usePlan((s) => s.deletePage);

  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = pages.map((p) => ({
      key: pageNoteKey(p.id),
      kind: "page",
      title: pageTitle(p.title),
      context: "Page",
      meta: notes[pageNoteKey(p.id)],
      pageId: p.id,
    }));

    for (const [key, meta] of Object.entries(notes)) {
      if (key.startsWith("bubble:")) {
        const [, treeId, id] = key.split(":");
        const tree = trees[treeId as TreeId];
        const node = tree?.nodes[id];
        if (!node) continue; // The bubble is gone; its page goes with it.
        const trail: string[] = [];
        for (let cur = node.parentId; cur; cur = tree.nodes[cur]?.parentId ?? null) {
          trail.unshift(tree.nodes[cur]?.label ?? "");
        }
        out.push({
          key,
          kind: "bubble",
          title: node.label,
          context: trail.join("  /  ") || "Bubble",
          meta,
        });
      } else if (key.startsWith("week:")) {
        const [, age, week] = key.split(":").map(Number);
        out.push({
          key,
          kind: "week",
          title: `Age ${age} · Week ${week + 1}`,
          context: formatRange(birthDate, age, week),
          meta,
        });
      }
    }

    return out.sort((a, b) => (b.meta?.updatedAt ?? 0) - (a.meta?.updatedAt ?? 0));
  }, [pages, notes, trees, birthDate]);

  const q = query.trim().toLowerCase();
  const shown = q
    ? entries.filter((e) =>
        `${e.title} ${e.context} ${e.meta?.excerpt ?? ""}`.toLowerCase().includes(q),
      )
    : entries;

  const open = entries.find((e) => e.key === openKey);

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
            placeholder="Search every page…"
            className="w-full rounded-xl border border-edge bg-surface py-2.5 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setOpenKey(pageNoteKey(addPage("")))}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus size={16} /> New page
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-faint">
            {q
              ? "Nothing matches that."
              : "No pages yet. Start one here, or open the notes on any bubble or week."}
          </p>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((entry) => {
              const Icon = ICON[entry.kind];
              return (
                <li key={entry.key}>
                  <button
                    onClick={() => setOpenKey(entry.key)}
                    className="pane flex h-full w-full flex-col gap-1.5 rounded-xl border border-edge bg-surface p-4 text-left transition hover:border-edge2 hover:bg-surface2"
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={14} className="shrink-0 text-accentink" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {entry.title}
                      </span>
                      {!!entry.meta?.images && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-faint">
                          <ImageIcon size={12} /> {entry.meta.images}
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs text-faint">{entry.context}</span>
                    <span className="line-clamp-3 text-sm text-muted">
                      {entry.meta?.excerpt || "Empty"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && (
        <NoteSheet
          noteKey={open.key}
          title={open.pageId ? (pages.find((p) => p.id === open.pageId)?.title ?? "") : open.title}
          subtitle={open.context}
          onRename={open.pageId ? (t) => renamePage(open.pageId!, t) : undefined}
          onDelete={
            open.pageId
              ? () => {
                  deletePage(open.pageId!);
                  void deleteNotes([open.key]);
                }
              : undefined
          }
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  );
}
