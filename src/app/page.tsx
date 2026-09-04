"use client";

import { Dashboard } from "@/components/Dashboard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function HomePage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <Dashboard />;
}
