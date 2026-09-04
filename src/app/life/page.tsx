"use client";

import { BubbleBoard } from "@/components/BubbleBoard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function LifeBubblesPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return (
    <BubbleBoard
      treeId="life"
      hint="Open it for every decade of your life, then a decade for its years, then a year for its months."
    />
  );
}
