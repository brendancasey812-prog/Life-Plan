"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ImageIcon, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { centreRadius, ringLayout } from "@/lib/layout";
import { planetStyle } from "@/lib/planet";
import { bubbleNoteKey, deleteNotes } from "@/lib/notes";
import { usePlan } from "@/lib/store";
import type { Bubble, NoteMeta, TreeId } from "@/lib/types";
import { calendarYear } from "@/lib/weeks";
import { NoteSheet } from "./NoteSheet";

/** Placeholder id for the dashed "add a bubble" circle in the ring. */
const ADD = "__add__";

/** Calendar years a timeline bubble covers, or "" for everything else. */
function subtitleFor(node: Bubble, birthDate: string): string {
  if (node.ageFrom === undefined) return "";
  const from = calendarYear(birthDate, node.ageFrom);
  if (node.month !== undefined) return String(from);
  const to = calendarYear(birthDate, node.ageTo ?? node.ageFrom);
  return from === to ? String(from) : `${from} – ${to}`;
}

export function BubbleBoard({
  treeId,
  hint,
  showRoot = true,
}: {
  treeId: TreeId;
  hint: string;
  /** False opens straight onto the root's children, with no bubble for it. */
  showRoot?: boolean;
}) {
  const tree = usePlan((s) => s.trees[treeId]);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const openBubble = usePlan((s) => s.openBubble);
  const addBubble = usePlan((s) => s.addBubble);
  const renameBubble = usePlan((s) => s.renameBubble);
  const deleteBubble = usePlan((s) => s.deleteBubble);
  const notes = usePlan((s) => s.notes);

  const [focusId, setFocusId] = useState<string | null>(showRoot ? null : tree.rootId);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Enter commits and unmounts the input, which then fires blur; the ref lets
  // the second call see that the edit is already done.
  const editingRef = useRef<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // An import or a reset can drop the bubble we were looking at; falling back
  // to the hero view heals that on the next click, with no extra state.
  const focus = focusId ? (tree.nodes[focusId] ?? null) : null;

  const open = useCallback(
    (id: string) => {
      openBubble(treeId, id);
      setFocusId(id);
      editingRef.current = null;
      setEditingId(null);
      setPendingDelete(null);
    },
    [openBubble, treeId],
  );

  const trail = useMemo(() => {
    const path: Bubble[] = [];
    let cur = focus;
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? (tree.nodes[cur.parentId] ?? null) : null;
    }
    return path;
  }, [focus, tree]);

  // The add circle rides in the ring, so the layout re-solves for it too.
  const atHiddenRoot = !showRoot && focus?.id === tree.rootId;
  const items = focus ? [...focus.childIds, ADD] : [];
  const ring = useMemo(
    () => ringLayout(items.length, box.w, box.h, !atHiddenRoot),
    [items.length, box.w, box.h, atHiddenRoot],
  );
  const cR = centreRadius(box.w, box.h, items.length > 0);

  function startEdit(id: string, value: string) {
    editingRef.current = id;
    setEditingId(id);
    setDraft(value);
    setPendingDelete(null);
  }

  function cancelEdit() {
    editingRef.current = null;
    setEditingId(null);
    setDraft("");
  }

  function commitEdit() {
    const id = editingRef.current;
    if (!id) return;
    editingRef.current = null;
    if (id === ADD) {
      if (draft.trim() && focus) addBubble(treeId, focus.id, draft);
    } else {
      renameBubble(treeId, id, draft);
    }
    setEditingId(null);
    setDraft("");
  }

  const deleting = pendingDelete ? tree.nodes[pendingDelete] : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 py-3 sm:px-6">
        {focus && !atHiddenRoot && (
          <button
            onClick={() => setFocusId(focus.parentId)}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {(showRoot ? trail : trail.slice(1)).map((node, i) => (
            <span key={node.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-faint">/</span>}
              <button
                onClick={() => setFocusId(node.id)}
                className={`rounded px-1.5 py-0.5 transition hover:bg-surface2 ${
                  node.id === focus?.id ? "font-medium text-fg" : "text-muted"
                }`}
              >
                {node.label}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden">
        {!focus ? (
          <HeroBubble
            node={tree.nodes[tree.rootId]}
            radius={centreRadius(box.w, box.h, false)}
            hint={hint}
            onOpen={() => open(tree.rootId)}
          />
        ) : (
          <>
            {/* The planet you are inside, held at the centre. */}
            {!atHiddenRoot && (
              <div
                className="bubble absolute flex items-center justify-center rounded-full text-center"
                style={{
                  left: box.w / 2 - cR,
                  top: box.h / 2 - cR,
                  width: cR * 2,
                  height: cR * 2,
                  ...planetStyle(focus.hue, cR, focus.id, true),
                }}
              >
                <Label
                  node={focus}
                  radius={cR}
                  birthDate={birthDate}
                  hasNote={!!notes[bubbleNoteKey(treeId, focus.id)]}
                />
              </div>
            )}

            {items.map((id, i) => {
              const spot = ring[i];
              if (!spot) return null;
              const node = id === ADD ? null : tree.nodes[id];
              if (id !== ADD && !node) return null;
              return (
                <div
                  key={id}
                  className="bubble group absolute"
                  style={{
                    left: spot.x - spot.r,
                    top: spot.y - spot.r,
                    width: spot.r * 2,
                    height: spot.r * 2,
                  }}
                >
                  {editingId === id ? (
                    // An input cannot live inside a button, so the circle
                    // becomes a plain box while it is being named.
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full"
                      style={
                        node
                          ? planetStyle(node.hue, spot.r, node.id)
                          : { border: "2px dashed var(--edge-2)" }
                      }
                    >
                      <InlineInput
                        value={draft}
                        radius={spot.r}
                        placeholder={node ? undefined : "Name…"}
                        onChange={setDraft}
                        onCommit={commitEdit}
                        onCancel={cancelEdit}
                      />
                    </div>
                  ) : node ? (
                    <button
                      onClick={() => open(node.id)}
                      className="flex h-full w-full items-center justify-center rounded-full text-center transition hover:brightness-115 focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                      style={planetStyle(node.hue, spot.r, node.id)}
                    >
                      <Label
                        node={node}
                        radius={spot.r}
                        birthDate={birthDate}
                        hasNote={!!notes[bubbleNoteKey(treeId, node.id)]}
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(ADD, "")}
                      aria-label="Add a bubble"
                      className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-edge2 text-muted transition hover:border-edge2 hover:text-fg"
                    >
                      <Plus size={Math.max(14, Math.min(spot.r * 0.7, 30))} />
                    </button>
                  )}

                  {node && editingId !== node.id && (
                    <div className="pointer-events-none absolute -top-1 right-0 flex gap-1 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
                      <IconButton
                        label={`Rename ${node.label}`}
                        onClick={() => startEdit(node.id, node.label)}
                      >
                        <Pencil size={12} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${node.label}`}
                        danger
                        onClick={() => setPendingDelete(node.id)}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {deleting && (
          <div className="absolute inset-x-0 bottom-4 mx-auto w-[min(26rem,90%)] rounded-xl border border-edge bg-sheet p-4 shadow-2xl">
            <p className="text-sm text-fg">
              Delete <span className="font-medium">{deleting.label}</span>
              {deleting.childIds.length > 0 && " and everything inside it"}?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  void deleteNotes(deleteBubble(treeId, deleting.id));
                  setPendingDelete(null);
                }}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                Delete
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm transition hover:bg-surface2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {focus && (
        <NoteBar meta={notes[bubbleNoteKey(treeId, focus.id)]} onOpen={() => setNotesOpen(true)} />
      )}

      {focus && notesOpen && (
        <NoteSheet
          noteKey={bubbleNoteKey(treeId, focus.id)}
          title={focus.label}
          subtitle={trail.map((n) => n.label).join("  /  ")}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </div>
  );
}

function HeroBubble({
  node,
  radius,
  hint,
  onOpen,
}: {
  node: Bubble;
  radius: number;
  hint: string;
  onOpen: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <button
        onClick={onOpen}
        className="bubble flex items-center justify-center rounded-full text-center transition hover:brightness-115 focus:outline-2 focus:outline-offset-4 focus:outline-accent"
        style={{ width: radius * 2, height: radius * 2, ...planetStyle(node.hue, radius, node.id) }}
      >
        <span
          className="bubble-label px-6 font-semibold tracking-tight text-white"
          style={{ fontSize: Math.max(18, Math.min(radius * 0.24, 48)) }}
        >
          {node.label}
        </span>
      </button>
      <p className="max-w-xs text-center text-sm text-faint">{hint}</p>
    </div>
  );
}

/** Roughly how wide one character is, as a fraction of the font size. */
const CHAR_WIDTH = 0.6;

function Label({
  node,
  radius,
  birthDate,
  hasNote,
}: {
  node: Bubble;
  radius: number;
  birthDate: string;
  hasNote: boolean;
}) {
  const box = radius * 1.68;
  // A single long word cannot wrap, so shrink the text until it fits across
  // the bubble rather than letting it break mid-word.
  const longest = node.label.split(/\s+/).reduce((a, w) => Math.max(a, w.length), 1);
  const size = Math.max(9, Math.min(radius * 0.26, 22, box / (CHAR_WIDTH * longest)));
  const subtitle = subtitleFor(node, birthDate);
  return (
    <span
      className="bubble-label flex flex-col items-center justify-center overflow-hidden leading-tight font-medium text-white"
      style={{ width: box, fontSize: size, wordBreak: "break-word" }}
    >
      {node.label}
      {subtitle && radius > 34 && (
        <span className="mt-0.5 font-normal text-white/60" style={{ fontSize: size * 0.72 }}>
          {subtitle}
        </span>
      )}
      {hasNote && <span className="mt-1 block h-1 w-1 rounded-full bg-white/80" aria-hidden />}
    </span>
  );
}

function InlineInput({
  value,
  radius,
  placeholder,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  radius: number;
  placeholder?: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      className="rounded-md border border-white/40 bg-black/40 px-1.5 py-0.5 text-center text-white outline-none"
      style={{ width: radius * 1.5, fontSize: Math.max(10, Math.min(radius * 0.26, 18)) }}
    />
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`rounded-full border border-edge2 bg-sheet p-1.5 text-muted shadow-lg transition hover:text-fg ${
        danger ? "hover:brightness-110" : "hover:bg-surface3"
      }`}
    >
      {children}
    </button>
  );
}

/** The strip under the canvas: a peek at the focused bubble's page. */
function NoteBar({ meta, onOpen }: { meta?: NoteMeta; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex shrink-0 items-center gap-3 border-t border-edge px-4 py-3 text-left transition hover:bg-surface sm:px-6"
    >
      <NotebookPen size={16} className="shrink-0 text-accentink" />
      <span className="min-w-0 flex-1 truncate text-sm text-muted">
        {meta?.excerpt || (meta?.images ? "" : "Add notes, screenshots and pictures…")}
      </span>
      {!!meta?.images && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-faint">
          <ImageIcon size={13} /> {meta.images}
        </span>
      )}
    </button>
  );
}
