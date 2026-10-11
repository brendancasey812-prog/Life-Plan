"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Compass,
  Flag,
  Home,
  LayoutGrid,
  BellRing,
  NotebookPen,
  Pencil,
  Plus,
  Repeat,
  Settings,
  Sofa,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { MONTHS } from "@/lib/seed";
import { mondayOf, weekShort } from "@/lib/calendarWeek";
import { todayKey } from "@/lib/goals";
import { goHome } from "@/lib/goHome";
import { useHydrated } from "@/lib/hydrated";
import { usePlan } from "@/lib/store";
import { SettingsPanel } from "./SettingsPanel";

/**
 * The bar in four: where you are, the goals that come round, the ones that are
 * a single thing being worked towards, and everything written down. A tab
 * still has one route — the menus only say which company it keeps.
 */
const MENUS = [
  {
    label: "Overview",
    icon: LayoutGrid,
    items: [
      { href: "/", label: "Overview", icon: LayoutGrid },
      { href: "/life", label: "Life Plan", icon: Sparkles },
      { href: "/map", label: "Life Categories", icon: Compass },
      { href: "/weeks", label: "Weeks", icon: CalendarRange },
    ],
  },
  {
    label: "General Goals",
    icon: Target,
    items: [
      { href: "/goals", label: "Life Goals", icon: Flag },
      { href: "/week", label: "Weekly Goals", icon: CalendarCheck },
      { href: "/month", label: "Monthly Goals", icon: CalendarDays },
      { href: "/year", label: "Yearly Goals", icon: Target },
    ],
  },
  {
    label: "Specific Goals",
    icon: Home,
    items: [
      { href: "/house", label: "House Plan", icon: Home },
      { href: "/rooms", label: "Marin Room", icon: Sofa },
    ],
  },
  {
    label: "Notes",
    icon: NotebookPen,
    items: [
      { href: "/notes", label: "Notes", icon: NotebookPen },
      { href: "/reminders", label: "Reminders", icon: BellRing },
      { href: "/weekly", label: "Every Week", icon: Repeat },
    ],
  },
];

const nav = MENUS.flatMap((menu) => menu.items);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [editingTabs, setEditingTabs] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const tray = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const away = (e: PointerEvent) => {
      const at = e.target as Node;
      if (!bar.current?.contains(at) && !tray.current?.contains(at)) setOpenMenu(null);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape);
    };
  }, [openMenu]);
  // trailingSlash: true means routes arrive as "/weeks/".
  const current = pathname.replace(/\/+$/, "") || "/";

  // The goal tabs carry the period they are pointed at, which is only knowable
  // in the browser — this is a static site, so a build-time date would go
  // stale on the shelf, and the focus itself is saved with the plan.
  const hydrated = useHydrated();
  const focus = usePlan((s) => s.focus);
  const hiddenTabs = usePlan((s) => s.settings.hiddenTabs);
  const tabOrder = usePlan((s) => s.settings.tabOrder);
  const updateSettings = usePlan((s) => s.updateSettings);
  // State rather than a ref: the chip being dragged is worth showing.
  const [dragging, setDragging] = useState<string | null>(null);

  // The bar is the user's: anything they do not use comes off it, and comes
  // back from the same place. Nothing is deleted — a hidden tab still works if
  // something links to it.
  const hidden = hiddenTabs ?? [];
  // The saved order first, then anything it does not mention — a tab added by
  // a later release lands at the end rather than disappearing.
  const saved = (tabOrder ?? []).map((href) => nav.find((t) => t.href === href)).filter(Boolean);
  const ordered = [
    ...(saved as typeof nav),
    ...nav.filter((tab) => !(tabOrder ?? []).includes(tab.href)),
  ];
  const shown = ordered.filter((tab) => !hidden.includes(tab.href));
  const off = ordered.filter((tab) => hidden.includes(tab.href));
  const hide = (href: string) => updateSettings({ hiddenTabs: [...hidden, href] });
  const show = (href: string) => updateSettings({ hiddenTabs: hidden.filter((h) => h !== href) });

  /** Drops the dragged tab into the slot another one holds. */
  const moveTo = (from: string, to: string) => {
    const order = ordered.map((t) => t.href);
    const at = order.indexOf(from);
    const onto = order.indexOf(to);
    if (at < 0 || onto < 0 || at === onto) return;
    order.splice(onto, 0, ...order.splice(at, 1));
    updateSettings({ tabOrder: order });
  };

  const nudge = (href: string, delta: -1 | 1) => {
    const order = ordered.map((t) => t.href);
    const at = order.indexOf(href);
    const onto = at + delta;
    if (at < 0 || onto < 0 || onto >= order.length) return;
    order.splice(onto, 0, ...order.splice(at, 1));
    updateSettings({ tabOrder: order });
  };
  const dated = useMemo(() => {
    if (!hydrated) return {} as Record<string, string>;
    const year = focus.year ?? todayKey("year");
    const month = focus.month ?? todayKey("month");
    return {
      "/year": `${year.year}`,
      "/month": `${MONTHS[month.month ?? 0]} ${month.year}`,
      "/week": weekShort(focus.week ?? mondayOf()),
    };
  }, [hydrated, focus]);

  return (
    <div className="flex h-screen flex-col">
      <header className="pane flex shrink-0 items-center gap-3 border-b border-edge px-3 py-3 sm:px-5">
        <nav
          ref={bar}
          className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {editingTabs &&
            shown.map(({ href, label, icon: Icon }) => (
              <span
                key={href}
                draggable
                onDragStart={(e) => {
                  // The href rides on the event itself: state set here has not
                  // re-rendered by the time the drop fires, so the handler
                  // below would still be reading the tab dragged before it.
                  e.dataTransfer.setData("text/plain", href);
                  e.dataTransfer.effectAllowed = "move";
                  setDragging(href);
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData("text/plain");
                  if (from) moveTo(from, href);
                  setDragging(null);
                }}
                className={`flex shrink-0 cursor-grab items-center gap-1.5 rounded-xl border border-edge bg-surface px-2 py-2 text-sm font-medium whitespace-nowrap text-muted active:cursor-grabbing ${
                  dragging === href ? "opacity-50" : ""
                }`}
              >
                {/* Dragging is a mouse gesture; these move a tab on a phone. */}
                <button
                  onClick={() => nudge(href, -1)}
                  aria-label={`Move ${label} left`}
                  className="rounded-full p-0.5 text-faint transition hover:bg-surface2 hover:text-fg"
                >
                  <ChevronLeft size={13} />
                </button>
                <Icon size={16} className="shrink-0" />
                {label}
                <button
                  onClick={() => nudge(href, 1)}
                  aria-label={`Move ${label} right`}
                  className="rounded-full p-0.5 text-faint transition hover:bg-surface2 hover:text-fg"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => hide(href)}
                  aria-label={`Take ${label} off the bar`}
                  className="rounded-full p-0.5 text-faint transition hover:bg-dangersoft hover:text-dangerink"
                >
                  <X size={13} />
                </button>
              </span>
            ))}

          {editingTabs &&
            off.map(({ href, label, icon: Icon }) => (
              <button
                key={href}
                onClick={() => show(href)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-edge2 px-3 py-2 text-sm font-medium whitespace-nowrap text-faint transition hover:text-fg"
              >
                <Icon size={16} className="shrink-0" />
                {label}
                <Plus size={13} className="-mr-1" />
              </button>
            ))}

          {editingTabs && shown.length === 0 && off.length === 0 && (
            <span className="px-2 text-sm text-faint">No tabs.</span>
          )}

          {!editingTabs &&
            MENUS.map((menu) => {
              // A menu shows what is left of it: a tab taken off the bar is
              // gone from here too, and a menu with nothing left goes with it.
              const items = shown.filter((tab) =>
                menu.items.some((item) => item.href === tab.href),
              );
              if (!items.length) return null;
              const here = items.find((item) => item.href === current);
              const open = openMenu === menu.label;
              const Icon = menu.icon;

              return (
                <button
                  key={menu.label}
                  onClick={() => setOpenMenu(open ? null : menu.label)}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    open
                      ? "bg-accent text-white"
                      : here
                        ? "bg-accentsoft text-accentink"
                        : "text-muted hover:bg-surface hover:text-fg"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {menu.label}
                  {here && !open && <span className="text-accentink/70">— {here.label}</span>}
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
              );
            })}
        </nav>

        <button
          onClick={() => setEditingTabs((v) => !v)}
          aria-label={editingTabs ? "Done editing the tabs" : "Edit the tabs"}
          title={editingTabs ? "Done" : "Add or remove tabs"}
          className={`shrink-0 rounded-xl border p-2 transition ${
            editingTabs
              ? "border-transparent bg-accent text-white hover:brightness-110"
              : "border-edge bg-surface text-muted hover:bg-surface2 hover:text-fg"
          }`}
        >
          {editingTabs ? <Check size={17} /> : <Pencil size={17} />}
        </button>

        {/* Settings sits in the top-right corner of every tab. */}
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="shrink-0 rounded-xl border border-edge bg-surface p-2 text-muted transition hover:bg-surface2 hover:text-fg"
        >
          <Settings size={17} />
        </button>
      </header>

      {/* Under the bar rather than hanging off a button: the bar scrolls
          sideways, and a panel inside a scroller is cut off at its edge. */}
      {openMenu && (
        <div
          ref={tray}
          role="menu"
          className="pane shrink-0 border-b border-edge bg-sheet px-3 py-2 shadow-lg sm:px-5"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {shown
              .filter((tab) =>
                MENUS.find((m) => m.label === openMenu)?.items.some((i) => i.href === tab.href),
              )
              .map(({ href, label, icon: ItemIcon }) => {
                const active = current === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => {
                      // Already here: send the screen home instead.
                      if (active) goHome(href);
                      setOpenMenu(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm whitespace-nowrap transition ${
                      active
                        ? "border-transparent bg-accentsoft font-medium text-accentink"
                        : "border-edge bg-surface text-muted hover:bg-surface2 hover:text-fg"
                    }`}
                  >
                    <ItemIcon size={15} className="shrink-0" />
                    {label}
                    {dated[href] && (
                      <span className={active ? "text-accentink/70" : "text-faint"}>
                        {dated[href]}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1">{children}</main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
