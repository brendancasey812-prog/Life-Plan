"use client";

import { Loading } from "@/components/Loading";
import { Reminders } from "@/components/Reminders";
import { useHydrated } from "@/lib/hydrated";

export default function RemindersPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Loading />;
  return <Reminders />;
}
