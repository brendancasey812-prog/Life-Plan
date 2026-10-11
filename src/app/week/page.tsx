"use client";

import { Loading } from "@/components/Loading";
import { WeekBoard } from "@/components/WeekBoard";
import { useHydrated } from "@/lib/hydrated";

export default function WeeklyGoalsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <WeekBoard />;
}
