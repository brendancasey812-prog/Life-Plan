"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
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
  const updateSettings = usePlan((s) => s.updateSettings);

  // The bar is the user's: anything they do not use comes off it, and comes
  // back from the same place. Nothing is deleted — a hidden tab still works if
  // something links to it.
  const hidden = hiddenTabs ?? [];
  const shown = nav.filter((tab) => !hidden.includes(tab.href));
  const off = nav.filter((tab) => hidden.includes(tab.href));
  const hide = (href: string) => updateSettings({ hiddenTabs: [...hidden, href] });
  const show = (href: string) => updateSettings({ hiddenTabs: hidden.filter((h) => h !== href) });
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
        <Link
          href="/"
          onClick={() => goHome("/")}
          className="hidden shrink-0 text-sm font-semibold tracking-tight text-muted transition hover:text-fg xl:block"
        >
          Life&nbsp;Plan
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {editingTabs &&
            shown.map(({ href, label, icon: Icon }) => (
              <span
                key={href}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-sm font-medium whitespace-nowrap text-muted"
              >
                <Icon size={16} className="shrink-0" />
                {label}
                <button
                  onClick={() => hide(href)}
                  aria-label={`Take ${label} off the bar`}
                  className="-mr-1 rounded-full p-0.5 text-faint transition hover:bg-dangersoft hover:text-dangerink"
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
