"use client";

import { BubbleBoard } from "@/components/BubbleBoard";
import { Loading } from "@/components/Loading";
import { useHydrated } from "@/lib/hydrated";

export default function RoomsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return (
    <BubbleBoard
      treeId="rooms"
      hint="The room, and the things being made for it."
      showRoot={false}
    />
  );
}
