"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Compass,
  LayoutGrid,
  BellRing,
  NotebookPen,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { MONTHS } from "@/lib/seed";
import { goHome } from "@/lib/goHome";
import { useHydrated } from "@/lib/hydrated";
import { SettingsPanel } from "./SettingsPanel";

const nav = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/life", label: "Life Plan", icon: Sparkles },
  { href: "/weeks", label: "Weeks", icon: CalendarRange },
  { href: "/map", label: "Life Categories", icon: Compass },
  { href: "/year", label: "Yearly Goals", icon: Target },
  { href: "/month", label: "Monthly Goals", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  // trailingSlash: true means routes arrive as "/weeks/".
  const current = pathname.replace(/\/+$/, "") || "/";

  // The goal tabs are dated, and the date is only knowable in the browser —
  // this is a static site, so a build-time date would go stale on the shelf.
  const hydrated = useHydrated();
  const dated = useMemo(() => {
    if (!hydrated) return {} as Record<string, string>;
    const now = new Date();
    return {
      "/year": `${now.getFullYear()}`,
      "/month": `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    };
  }, [hydrated]);

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
          {nav.map(({ href, label, icon: Icon }) => {
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
