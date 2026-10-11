"use client";

import { Loading } from "@/components/Loading";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { useHydrated } from "@/lib/hydrated";

export default function EveryWeekPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="pane rounded-2xl border border-edge bg-surface p-5 sm:p-6">
          <WeeklyGoals limit={30} />
        </div>
      </div>
    </div>
  );
}
