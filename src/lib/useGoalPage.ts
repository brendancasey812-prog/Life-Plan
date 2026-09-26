"use client";

import { useEffect, useMemo } from "react";
import { findTimeline, periodFor, trailOf, withinPlan, type Period } from "./goals";
import { bubbleNoteKey } from "./notes";
import { usePlan } from "./store";
import type { NoteMeta } from "./types";

export type Scope = "year" | "month";

export interface GoalPage {
  period: Period;
  /** False once a step has gone past the start or end of the plan. */
  inPlan: boolean;
  /** Whether stepping back or forward would stay inside the plan. */
  canPrev: boolean;
  canNext: boolean;
  /** The `Age N` or month bubble this page belongs to, once it exists. */
  bubbleId: string | null;
  /** The note key the goal tab and the bubble both open. */
  noteKey: string | null;
  meta?: NoteMeta;
  trail: string[];
}

/**
 * Resolves this year's or this month's page. My Life's timeline is generated
 * as it is opened, so a period nobody has visited yet has no bubble — this
 * builds the part of it the page needs, which is what ties the goal tabs, the
 * widgets and the bubbles to one shared page rather than three copies.
 */
export function useGoalPage(scope: Scope, offset = 0): GoalPage {
  const tree = usePlan((s) => s.trees.life);
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const notes = usePlan((s) => s.notes);
  const resolveTimeline = usePlan((s) => s.resolveTimeline);

  const period = useMemo(
    () => periodFor(birthDate, lifespan, scope, offset),
    [birthDate, lifespan, scope, offset],
  );
  const inPlan = withinPlan(birthDate, lifespan, period);
  const stepFits = (delta: number) =>
    withinPlan(birthDate, lifespan, periodFor(birthDate, lifespan, scope, offset + delta));
  const found = useMemo(
    () => findTimeline(tree, period.age, period.month),
    [tree, period.age, period.month],
  );

  useEffect(() => {
    if (!found.complete) resolveTimeline(period.age, period.month);
  }, [found.complete, period.age, period.month, resolveTimeline]);

  const bubbleId = scope === "year" ? found.yearId : found.monthId;
  const noteKey = bubbleId ? bubbleNoteKey("life", bubbleId) : null;

  return {
    period,
    inPlan,
    canPrev: stepFits(-1),
    canNext: stepFits(1),
    bubbleId,
    noteKey,
    meta: noteKey ? notes[noteKey] : undefined,
    trail: bubbleId ? trailOf(tree, bubbleId) : [],
  };
}
