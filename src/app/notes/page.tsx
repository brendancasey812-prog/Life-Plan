"use client";

import { Loading } from "@/components/Loading";
import { Notebook } from "@/components/Notebook";
import { useHydrated } from "@/lib/hydrated";

export default function NotesPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <Notebook />;
}
