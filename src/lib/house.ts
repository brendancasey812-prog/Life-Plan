import type { HousePlan } from "./types";

/** The note page behind a life goal, like everything else that holds writing. */
export const goalNoteKey = (id: string) => `goal:${id}`;

export interface ProjectionRow {
  year: number;
  age: number;
  beg: number;
  /** Null on the opening row: it is where the fund stands, not a year of it. */
  contribution: number | null;
  income: number | null;
  end: number;
}

/**
 * What the fund does between now and the year the house is wanted.
 *
 * The first row is today's position — what is in the fund, with no year run
 * against it yet. Every row after it earns on the balance it starts with plus
 * what goes in that year, which is what makes a year's contribution worth its
 * own return rather than next year's.
 */
export function project(plan: HousePlan, startAge: number, targetAge: number): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  let beg = plan.startBalance;
  for (let age = startAge, year = 1; age <= targetAge; age++, year++) {
    if (year === 1) {
      rows.push({ year, age, beg, contribution: null, income: null, end: beg });
      continue;
    }
    const contribution = plan.contributions[String(age)] ?? plan.contribution;
    const income = ((beg + contribution) * plan.rate) / 100;
    const end = beg + contribution + income;
    rows.push({ year, age, beg, contribution, income, end });
    beg = end;
  }
  return rows;
}

/** What has to be saved: the deposit, as a share of what the house costs. */
export function depositOf(plan: HousePlan): number {
  return (plan.cost * plan.depositPct) / 100;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function usd(n: number): string {
  return MONEY.format(Math.round(n));
}
