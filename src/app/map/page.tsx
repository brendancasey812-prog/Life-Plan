"use client";

import { BubbleBoard } from "@/components/BubbleBoard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function LifeCategoriesPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  // No parent planet: the tab opens straight onto the categories themselves.
  return (
    <BubbleBoard treeId="map" hint="The categories you build your life around." showRoot={false} />
  );
}
