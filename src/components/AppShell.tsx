"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarRange, Compass, NotebookPen, Settings, Sparkles } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

const nav = [
  { href: "/", label: "My Life", icon: Sparkles },
  { href: "/weeks", label: "Weeks", icon: CalendarRange },
  { href: "/map", label: "Life Map", icon: Compass },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  // trailingSlash: true means routes arrive as "/weeks/".
  const current = pathname.replace(/\/+$/, "") || "/";

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-white/[0.07] px-4 py-3 backdrop-blur-xl sm:px-6">
        <span className="hidden text-sm font-semibold tracking-tight text-zinc-300 sm:block">
          Life&nbsp;Plan
        </span>

        <nav className="flex flex-1 items-center gap-1.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = current === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Settings sits in the top-right corner of every tab. */}
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          <Settings size={17} />
        </button>
      </header>

      <main className="min-h-0 flex-1">{children}</main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
