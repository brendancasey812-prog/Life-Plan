"use client";

import { GoalsBoard } from "@/components/GoalsBoard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function YearlyGoalsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <GoalsBoard scope="year" />;
}
