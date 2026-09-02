"use client";

import { Loading } from "@/components/Loading";
import { WeeksGrid } from "@/components/WeeksGrid";
import { useHydrated } from "@/lib/hydrated";

export default function WeeksPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <WeeksGrid />;
}
