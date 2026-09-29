"use client";

import { HouseTab } from "@/components/HouseTab";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function HousePage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <HouseTab />;
}
