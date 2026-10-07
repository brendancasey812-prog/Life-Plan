"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
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
  Settings,
  Sofa,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { MONTHS } from "@/lib/seed";
import { todayKey } from "@/lib/goals";
import { goHome } from "@/lib/goHome";
import { useHydrated } from "@/lib/hydrated";
import { usePlan } from "@/lib/store";
import { SettingsPanel } from "./SettingsPanel";

const nav = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/life", label: "Life Plan", icon: Sparkles },
  { href: "/weeks", label: "Weeks", icon: CalendarRange },
  { href: "/map", label: "Life Categories", icon: Compass },
  { href: "/rooms", label: "Marin Room", icon: Sofa },
  { href: "/year", label: "Yearly Goals", icon: Target },
  { href: "/month", label: "Monthly Goals", icon: CalendarDays },
  { href: "/goals", label: "Life Goals", icon: Flag },
  { href: "/house", label: "House", icon: Home },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [editingTabs, setEditingTabs] = useState(false);
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
    };
  }, [hydrated, focus]);

  return (
    <div className="flex h-screen flex-col">
      <header className="pane flex shrink-0 items-center gap-3 border-b border-edge px-3 py-3 sm:px-5">
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            shown.map(({ href, label, icon: Icon }) => {
              const active = current === href;
              const suffix = dated[href];
              return (
                <Link
                  key={href}
                  href={href}
                  // Already here: send the screen home instead of navigating.
                  onClick={() => active && goHome(href)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-accentsoft text-accentink"
                      : "text-muted hover:bg-surface hover:text-fg"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                  {suffix && (
                    <span className={active ? "text-accentink/80" : "text-faint"}>— {suffix}</span>
                  )}
                </Link>
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

      <main className="min-h-0 flex-1">{children}</main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
