"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useGoHome } from "@/lib/goHome";
import { tileStyle } from "@/lib/planet";
import { usePlan } from "@/lib/store";
import { bubbleNoteKey, deleteNotes } from "@/lib/notes";
import type { Bubble, TreeId } from "@/lib/types";
import { calendarYear } from "@/lib/weeks";
import { NotesPanel } from "./NotesPanel";

/**
 * How wide a tile sits, out of four. Two is the default, so a board reads two
 * to a row until the user says otherwise.
 */
const DEFAULT_SPAN = 2;

/**
 * Four columns at every width, so a size means the same thing on a phone as on
 * a desktop: a quarter, a half, three quarters, the row. The tile's own type
 * and padding scale instead, which is what keeps a quarter readable at 390px.
 */
const SPANS: Record<1 | 2 | 3 | 4, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
};

/** How tall, how big the label, by how wide the tile is. */
const SIZING: Record<1 | 2 | 3 | 4, { box: string; label: string; sub: string }> = {
  1: {
    box: "min-h-[4.75rem] p-2.5 sm:min-h-[6rem] sm:p-3.5",
    label: "text-[13px] sm:text-sm",
    sub: "text-[10px]",
  },
  2: {
    box: "min-h-[5.5rem] p-3 sm:min-h-[7rem] sm:p-4",
    label: "text-sm sm:text-base",
    sub: "text-[11px] sm:text-xs",
  },
  3: {
    box: "min-h-[6rem] p-3.5 sm:min-h-[7.5rem] sm:p-4",
    label: "text-base sm:text-lg",
    sub: "text-xs",
  },
  4: {
    box: "min-h-[6rem] p-3.5 sm:min-h-[8rem] sm:p-5",
    label: "text-base sm:text-xl",
    sub: "text-xs",
  },
};

/** Calendar years a timeline bubble covers, or "" for everything else. */
function subtitleFor(node: Bubble, birthDate: string): string {
  if (node.ageFrom === undefined) return "";
  const from = calendarYear(birthDate, node.ageFrom);
  if (node.month !== undefined) return String(from);
  const to = calendarYear(birthDate, node.ageTo ?? node.ageFrom);
  return from === to ? String(from) : `${from} – ${to}`;
}

/**
 * Whether a timeline bubble is the period we are in now. Measured on the
 * calendar the tiles are labelled with — the months under `Age 25` are that
 * tile's own 2026 — so the mark lands on the same one the goal tabs open.
 */
function isNow(node: Bubble, birthDate: string, now: Date): boolean {
  if (node.ageFrom === undefined) return false;
  const age = now.getFullYear() - calendarYear(birthDate, 0);
  if (age < node.ageFrom || age > (node.ageTo ?? node.ageFrom)) return false;
  return node.month === undefined || node.month === now.getMonth();
}

/**
 * A board of tiles: the decades, the years, the months, the categories. One
 * level at a time, each tile opening the level under it. The arrangement is
 * the user's — order, width and name — and is kept with the plan, so a board
 * stays as it was left.
 */
export function BubbleBoard({
  treeId,
  hint,
  showRoot = true,
}: {
  treeId: TreeId;
  hint: string;
  /** False opens straight onto the root's children, with no tile for it. */
  showRoot?: boolean;
}) {
  const tree = usePlan((s) => s.trees[treeId]);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const notes = usePlan((s) => s.notes);
  const lifeGoals = usePlan((s) => s.goals);
  const openBubble = usePlan((s) => s.openBubble);
  const addBubble = usePlan((s) => s.addBubble);
  const renameBubble = usePlan((s) => s.renameBubble);
  const resizeBubble = usePlan((s) => s.resizeBubble);
  const resizeChildren = usePlan((s) => s.resizeChildren);
  const moveBubble = usePlan((s) => s.moveBubble);
  const deleteBubble = usePlan((s) => s.deleteBubble);

  // One reading of the clock for the whole board, so every level agrees on
  // which tile is now.
  const today = useMemo(() => new Date(), []);

  const [focusId, setFocusId] = useState<string | null>(showRoot ? null : tree.rootId);
  const [editing, setEditing] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  useGoHome(pathname, () => {
    setFocusId(showRoot ? null : tree.rootId);
    setNotesOpen(false);
    setEditing(false);
    setPendingDelete(null);
    setRenamingId(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  });

  // An import or a reset can drop the bubble we were looking at; falling back
  // to the board's home heals that on the next click, with no extra state.
  const focus = focusId ? (tree.nodes[focusId] ?? null) : null;

  const open = useCallback(
    (id: string) => {
      openBubble(treeId, id);
      setFocusId(id);
      setRenamingId(null);
      setPendingDelete(null);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [openBubble, treeId],
  );

  // A link can name a bubble to open — `/map#<id>` from the Overview card —
  // so a category opens on that category rather than the board's own home.
  useEffect(() => {
    const follow = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id && tree.nodes[id]) open(id);
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [tree, open]);

  const trail = useMemo(() => {
    const path: Bubble[] = [];
    let cur = focus;
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? (tree.nodes[cur.parentId] ?? null) : null;
    }
    return path;
  }, [focus, tree]);

  const children = useMemo(
    () => (focus?.childIds ?? []).map((id) => tree.nodes[id]).filter(Boolean),
    [focus, tree],
  );

  // A goal belongs to the ages its tile covers, so `A home by 30` shows on the
  // 30 tile's board and on the decade holding it.
  const aimedHere = useMemo(() => {
    if (treeId !== "life" || !focus || focus.ageFrom === undefined || focus.month !== undefined) {
      return [];
    }
    const to = focus.ageTo ?? focus.ageFrom;
    return lifeGoals.filter((g) => g.targetAge >= focus.ageFrom! && g.targetAge <= to);
  }, [treeId, focus, lifeGoals]);

  function commitRename(id: string) {
    if (id === "__add__") {
      if (draft.trim() && focus) addBubble(treeId, focus.id, draft);
      setAdding(false);
    } else {
      renameBubble(treeId, id, draft);
    }
    setRenamingId(null);
    setDraft("");
  }

  const deleting = pendingDelete ? tree.nodes[pendingDelete] : null;
  const atHiddenRoot = !showRoot && focus?.id === tree.rootId;

  return (
    <div className="flex h-full">
      {focus && (
        <NotesPanel
          noteKey={bubbleNoteKey(treeId, focus.id)}
          title={focus.label}
          subtitle={trail.map((n) => n.label).join("  /  ")}
          placeholder={`What is ${focus.label} for? Write it down…`}
          meta={notes[bubbleNoteKey(treeId, focus.id)]}
          open={notesOpen}
          onOpenChange={setNotesOpen}
          grid
        />
      )}

      {/* On a phone the panel takes the screen; there is no room for both. */}
      <div className={`min-h-0 flex-1 flex-col ${focus && notesOpen ? "hidden lg:flex" : "flex"}`}>
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
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
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

          {focus && (
            <button
              onClick={() => {
                setEditing((v) => !v);
                setRenamingId(null);
                setAdding(false);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition ${
                editing
                  ? "border-transparent bg-accent text-white hover:brightness-110"
                  : "border-edge bg-surface text-muted hover:bg-surface2 hover:text-fg"
              }`}
            >
              {editing ? <Check size={15} /> : <Pencil size={15} />}
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {!focus ? (
            <Hero node={tree.nodes[tree.rootId]} hint={hint} onOpen={() => open(tree.rootId)} />
          ) : (
            <>
              {editing && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-surface p-2.5 text-xs text-faint">
                  <span className="font-medium text-muted">Every tile:</span>
                  {([1, 2, 3, 4] as const).map((span) => (
                    <button
                      key={span}
                      onClick={() => resizeChildren(treeId, focus.id, span)}
                      className="h-6 w-6 rounded-full text-[11px] text-muted transition hover:bg-surface2 hover:text-fg"
                    >
                      {span}
                    </button>
                  ))}
                  <span className="text-faint">columns</span>
                  <span className="ml-auto">
                    Drag a tile to move it, or use its arrows. The pencil renames it.
                  </span>
                </div>
              )}

              <ul className="grid grid-flow-row-dense grid-cols-4 gap-2 sm:gap-3">
                {children.map((node, i) => (
                  <li key={node.id} className={SPANS[node.span ?? DEFAULT_SPAN]}>
                    <Tile
                      node={node}
                      index={i}
                      subtitle={subtitleFor(node, birthDate)}
                      now={isNow(node, birthDate, today)}
                      hasNote={!!notes[bubbleNoteKey(treeId, node.id)]}
                      editing={editing}
                      renaming={renamingId === node.id}
                      draft={draft}
                      dragging={dragging === node.id}
                      onOpen={() => open(node.id)}
                      onStartRename={() => {
                        setRenamingId(node.id);
                        setDraft(node.label);
                      }}
                      onDraft={setDraft}
                      onCommit={() => commitRename(node.id)}
                      onCancel={() => {
                        setRenamingId(null);
                        setDraft("");
                      }}
                      onResize={(span) => resizeBubble(treeId, node.id, span)}
                      onNudge={(delta) => {
                        const at = children.findIndex((c) => c.id === node.id);
                        const onto = children[at + delta];
                        if (onto) moveBubble(treeId, node.id, onto.id);
                      }}
                      onDelete={() => setPendingDelete(node.id)}
                      onDragStart={() => setDragging(node.id)}
                      onDragEnd={() => setDragging(null)}
                      onDrop={(from) => {
                        moveBubble(treeId, from, node.id);
                        setDragging(null);
                      }}
                    />
                  </li>
                ))}

                {editing && (
                  <li className="col-span-2 sm:col-span-1">
                    {adding ? (
                      <div className="flex h-full min-h-[4.75rem] items-center rounded-2xl border border-dashed border-edge2 p-2.5">
                        <InlineInput
                          value={draft}
                          placeholder="Name…"
                          onChange={setDraft}
                          onCommit={() => commitRename("__add__")}
                          onCancel={() => {
                            setAdding(false);
                            setDraft("");
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdding(true);
                          setDraft("");
                        }}
                        className="flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-edge2 text-sm text-faint transition hover:border-accent hover:text-fg"
                      >
                        <Plus size={18} />
                        Add
                      </button>
                    )}
                  </li>
                )}
              </ul>

              {children.length === 0 && !editing && (
                <p className="flex items-center gap-2 py-10 text-center text-sm text-faint">
                  <LayoutGrid size={15} /> Nothing inside {focus.label} yet — press Edit to add
                  something.
                </p>
              )}
            </>
          )}
        </div>

        {focus && aimedHere.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-edge px-4 py-2 sm:px-6">
            <span className="flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] text-accentink uppercase">
              <Flag size={13} /> Life {aimedHere.length === 1 ? "goal" : "goals"}
            </span>
            {aimedHere.map((goal) => (
              <Link
                key={goal.id}
                href={goal.plan === "house" ? "/house" : "/goals"}
                className={`flex items-center gap-1 rounded-full border border-edge bg-surface px-3 py-1 text-sm transition hover:bg-surface2 hover:text-fg ${
                  goal.done ? "text-faint line-through" : "text-muted"
                }`}
              >
                {goal.title || "Untitled goal"}
                <ArrowUpRight size={13} className="text-faint" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {deleting && (
        <div className="fixed inset-x-0 bottom-6 z-40 mx-auto w-[min(26rem,90%)] rounded-xl border border-edge bg-sheet p-4 shadow-2xl">
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
  );
}

/**
 * The board's front door: one card in the middle of the screen, there to be
 * gone through rather than read. Pressing it drops it down and out of the way
 * before the board behind it arrives, so leaving the screen is the thing the
 * screen most obviously does.
 */
function Hero({ node, hint, onOpen }: { node: Bubble; hint: string; onOpen: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    // Matches the door's transition; the board is built the moment it lands.
    setTimeout(onOpen, 260);
  };

  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center py-6">
      <button
        onClick={leave}
        style={tileStyle(node.hue)}
        className={`door group flex w-[min(30rem,100%)] flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center text-white transition-transform sm:px-8 sm:py-16 ${
          leaving ? "door-leaving" : "hover:-translate-y-1"
        }`}
      >
        <span className="bubble-label text-3xl font-semibold tracking-tight sm:text-5xl">
          {node.label}
        </span>
        <span className="bubble-label max-w-xs text-sm text-white/80">{hint}</span>
        <span className="mt-2 flex flex-col items-center gap-1 text-sm text-white/90">
          Open
          <ChevronDown size={18} className="transition-transform group-hover:translate-y-0.5" />
        </span>
      </button>
    </div>
  );
}

function Tile({
  node,
  index,
  subtitle,
  now,
  hasNote,
  editing,
  renaming,
  draft,
  dragging,
  onOpen,
  onStartRename,
  onDraft,
  onCommit,
  onCancel,
  onResize,
  onNudge,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  node: Bubble;
  index: number;
  subtitle: string;
  now: boolean;
  hasNote: boolean;
  editing: boolean;
  renaming: boolean;
  draft: string;
  dragging: boolean;
  onOpen: () => void;
  onStartRename: () => void;
  onDraft: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onResize: (span: 1 | 2 | 3 | 4) => void;
  onNudge: (delta: -1 | 1) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (from: string) => void;
}) {
  const ref = useReveal(index);
  const size = SIZING[node.span ?? DEFAULT_SPAN];

  const card = `group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl text-left text-white transition ${size.box}`;

  if (renaming) {
    return (
      <div ref={ref} className={`tile ${card}`} style={tileStyle(node.hue)}>
        <InlineInput
          value={draft}
          onChange={onDraft}
          onCommit={onCommit}
          onCancel={onCancel}
          placeholder="Name…"
        />
      </div>
    );
  }

  const body = (
    <>
      <span className="bubble-label flex items-start justify-between gap-1.5">
        <span className="min-w-0">
          <span className={`block leading-snug font-medium break-words ${size.label}`}>
            {node.label}
          </span>
          {subtitle && (
            <span className={`block text-white/70 tabular-nums ${size.sub}`}>{subtitle}</span>
          )}
        </span>
        {hasNote && (
          <span
            aria-label="Has notes"
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/85"
          />
        )}
      </span>
      {now && (
        <span className="mt-1.5 w-fit rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-accentink uppercase sm:mt-2 sm:px-2 sm:text-[10px]">
          Now
        </span>
      )}
    </>
  );

  if (!editing) {
    return (
      <button
        ref={ref}
        onClick={onOpen}
        style={tileStyle(node.hue)}
        className={`tile ${card} hover:-translate-y-0.5 hover:brightness-105`}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(e) => {
        // The id rides on the event: state set here has not re-rendered by the
        // time the drop fires.
        e.dataTransfer.setData("text/plain", node.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData("text/plain");
        if (from && from !== node.id) onDrop(from);
      }}
      style={tileStyle(node.hue)}
      className={`tile ${card} cursor-grab active:cursor-grabbing ${dragging ? "opacity-50" : ""}`}
    >
      {body}

      <span className="mt-2 flex flex-wrap items-center gap-0.5 sm:gap-1">
        <TileButton label={`Move ${node.label} back`} onClick={() => onNudge(-1)}>
          <ChevronLeft size={13} />
        </TileButton>
        <TileButton label={`Move ${node.label} forward`} onClick={() => onNudge(1)}>
          <ChevronRight size={13} />
        </TileButton>
        <TileButton label={`Rename ${node.label}`} onClick={onStartRename}>
          <Pencil size={12} />
        </TileButton>
        {([1, 2, 3, 4] as const).map((span) => (
          <button
            key={span}
            onClick={() => onResize(span)}
            aria-label={`${span} column${span > 1 ? "s" : ""}`}
            aria-pressed={(node.span ?? DEFAULT_SPAN) === span}
            className={`h-5 w-5 rounded-full text-[10px] transition sm:h-6 sm:w-6 sm:text-[11px] ${
              (node.span ?? DEFAULT_SPAN) === span
                ? "bg-white/90 font-medium text-accentink"
                : "text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {span}
          </button>
        ))}
        <TileButton label={`Delete ${node.label}`} danger onClick={onDelete}>
          <Trash2 size={12} />
        </TileButton>
      </span>
    </div>
  );
}

function TileButton({
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
      className={`flex h-5 w-5 items-center justify-center rounded-full text-white/70 transition sm:h-6 sm:w-6 ${
        danger ? "hover:bg-white/25 hover:text-white" : "hover:bg-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Tiles arrive as they are scrolled to rather than all at once, a beat apart
 * down the board. Anything already on screen is in place before the first
 * paint, so the board never opens empty.
 */
function useReveal(index: number) {
  const ref = useRef<HTMLElement | null>(null);

  return useCallback(
    (el: HTMLElement | null) => {
      ref.current = el;
      if (!el) return;
      el.style.setProperty("--i", String(Math.min(index, 11)));
      if (typeof IntersectionObserver === "undefined") {
        el.classList.add("is-in");
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.disconnect();
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(el);
    },
    [index],
  );
}

function InlineInput({
  value,
  placeholder,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
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
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      className="w-full rounded-lg border border-edge bg-surface2 px-2 py-1 text-sm outline-none focus:border-accent"
    />
  );
}
