"use client";

import { BubbleBoard } from "@/components/BubbleBoard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function LifeMapPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return (
    <BubbleBoard treeId="map" hint="Open it for the areas you are building your life around." />
  );
}
