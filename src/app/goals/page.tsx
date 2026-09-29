"use client";

import { LifeGoals } from "@/components/LifeGoals";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function LifeGoalsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <LifeGoals />;
}
