"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  findTimeline,
  periodOf,
  sameKey,
  stepKey,
  todayKey,
  trailOf,
  withinPlan,
  type Period,
  type Scope,
} from "./goals";
import { bubbleNoteKey } from "./notes";
import { usePlan } from "./store";
import type { NoteMeta } from "./types";

export type { Scope };

export interface GoalPage {
  period: Period;
  /** False if the period lies outside the plan's span. */
  inPlan: boolean;
  /** Whether stepping back or forward would stay inside the plan. */
  canPrev: boolean;
  canNext: boolean;
  /** Whether this is the period today falls in. */
  isToday: boolean;
  /** Moves the plan's focus `delta` periods from this one. */
  step: (delta: number) => void;
  /** Points the focus back at today. */
  today: () => void;
  /** Points the focus at this period — for a card showing another one. */
  pin: () => void;
  /** The `Age N` or month bubble this page belongs to, once it exists. */
  bubbleId: string | null;
  /** The note key the goal tab and the bubble both open. */
  noteKey: string | null;
  meta?: NoteMeta;
  trail: string[];
}

/**
 * Resolves the year's or month's page the plan is pointed at — `shift` periods
 * back or forward from it, for a card that looks at a neighbouring period.
 *
 * My Life's timeline is generated as it is opened, so a period nobody has
 * visited yet has no bubble; this builds the part of it the page needs, which
 * is what ties the goal tabs, the widgets and the bubbles to one shared page
 * rather than three copies.
 */
export function useGoalPage(scope: Scope, shift = 0): GoalPage {
  const tree = usePlan((s) => s.trees.life);
  const { birthDate, lifespan } = usePlan((s) => s.settings);
  const focused = usePlan((s) => s.focus[scope]);
  const notes = usePlan((s) => s.notes);
  const resolveTimeline = usePlan((s) => s.resolveTimeline);
  const setFocus = usePlan((s) => s.setFocus);

  const key = useMemo(() => {
    const base = focused ?? todayKey(scope);
    return shift ? stepKey(base, shift) : base;
  }, [focused, scope, shift]);

  const period = useMemo(() => periodOf(birthDate, lifespan, key), [birthDate, lifespan, key]);
  const fits = (delta: number) => withinPlan(birthDate, lifespan, stepKey(key, delta));

  const found = useMemo(
    () => findTimeline(tree, period.age, period.month),
    [tree, period.age, period.month],
  );

  useEffect(() => {
    if (!found.complete) resolveTimeline(period.age, period.month);
  }, [found.complete, period.age, period.month, resolveTimeline]);

  const step = useCallback(
    (delta: number) => setFocus(scope, stepKey(key, delta)),
    [setFocus, scope, key],
  );
  const today = useCallback(() => setFocus(scope, null), [setFocus, scope]);
  const pin = useCallback(() => setFocus(scope, key), [setFocus, scope, key]);

  const bubbleId = scope === "year" ? found.yearId : found.monthId;
  const noteKey = bubbleId ? bubbleNoteKey("life", bubbleId) : null;

  return {
    period,
    inPlan: withinPlan(birthDate, lifespan, key),
    canPrev: fits(-1),
    canNext: fits(1),
    isToday: sameKey(key, todayKey(scope)),
    step,
    today,
    pin,
    bubbleId,
    noteKey,
    meta: noteKey ? notes[noteKey] : undefined,
    trail: bubbleId ? trailOf(tree, bubbleId) : [],
  };
}
