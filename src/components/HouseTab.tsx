"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ExternalLink, Home, Plus, Trash2 } from "lucide-react";
import { useGoHome } from "@/lib/goHome";
import { depositOf, project, usd } from "@/lib/house";
import { usePlan } from "@/lib/store";
import { calendarYear } from "@/lib/weeks";

/**
 * The house budget. Everything with a box round it is the user's to change and
 * the rest follows from it as it is typed: the deposit from the cost, and the
 * fund's year-by-year from what goes in and what it earns.
 */
export function HouseTab() {
  const house = usePlan((s) => s.house);
  const goals = usePlan((s) => s.goals);
  const birthDate = usePlan((s) => s.settings.birthDate);
  const updateHouse = usePlan((s) => s.updateHouse);
  const setContribution = usePlan((s) => s.setContribution);
  const addListing = usePlan((s) => s.addListing);
  const updateListing = usePlan((s) => s.updateListing);
  const deleteListing = usePlan((s) => s.deleteListing);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useGoHome(pathname, () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));

  const goal = goals.find((g) => g.plan === "house");
  const targetAge = goal?.targetAge ?? 30;
  const ageNow = Math.max(0, new Date().getFullYear() - calendarYear(birthDate, 0));
  const startAge = Math.min(ageNow, targetAge);

  const rows = project(house, startAge, targetAge);
  const deposit = depositOf(house);
  const atTarget = rows[rows.length - 1]?.end ?? house.startBalance;
  const gap = atTarget - deposit;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="pane relative overflow-hidden rounded-2xl border border-edge px-5 py-5 sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 140% at 0% 0%, rgba(99,102,241,0.18), transparent 62%), radial-gradient(100% 160% at 100% 0%, rgba(45,212,191,0.12), transparent 60%)",
            }}
          />
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-accentink uppercase">
            <Home size={13} /> Life goal
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {goal?.title || "A home"}
            </h1>
            <Link
              href="/goals"
              className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs text-muted transition hover:bg-surface2 hover:text-fg"
            >
              Life Goals <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted">
            By age {targetAge}, in {calendarYear(birthDate, targetAge)}.
          </p>
        </header>

        {/* What it costs, and so what has to be in the fund. */}
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <Figure
            label="The house"
            value={house.cost}
            onChange={(cost) => updateHouse({ cost })}
            prefix="$"
            hint="What you expect to pay"
          />
          <Figure
            label="Deposit"
            value={house.depositPct}
            onChange={(depositPct) => updateHouse({ depositPct })}
            suffix="%"
            hint="Of what the house costs"
          />
          <div className="pane rounded-2xl border border-edge bg-surface2 p-4 sm:p-5">
            <span className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
              You need
            </span>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {usd(deposit)}
            </p>
            <p className="mt-1 text-xs text-faint">
              {house.depositPct}% of {usd(house.cost)}
            </p>
          </div>
        </section>

        {/* The fund, year by year. */}
        <section className="pane mt-5 rounded-2xl border border-edge bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-base font-medium">The fund, year by year</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
              <Inline
                label="In it today"
                value={house.startBalance}
                onChange={(startBalance) => updateHouse({ startBalance })}
                prefix="$"
              />
              <Inline
                label="Earning"
                value={house.rate}
                onChange={(rate) => updateHouse({ rate })}
                suffix="%"
              />
              <Inline
                label="Each year"
                value={house.contribution}
                onChange={(contribution) => updateHouse({ contribution })}
                prefix="$"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-xs tracking-wide text-faint uppercase">
                  <th className="py-2 pr-3 font-medium">Year</th>
                  <th className="py-2 pr-3 font-medium">Age</th>
                  <th className="py-2 pr-3 text-right font-medium">Beginning</th>
                  <th className="py-2 pr-3 text-right font-medium">Contribution</th>
                  <th className="py-2 pr-3 text-right font-medium">Income</th>
                  <th className="py-2 text-right font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.age} className="border-b border-edge/60 last:border-0">
                    <td className="py-2 pr-3 tabular-nums text-faint">{row.year}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted">{row.age}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted">{usd(row.beg)}</td>
                    <td className="py-2 pr-3 text-right">
                      {row.contribution === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <input
                          type="number"
                          value={row.contribution === 0 ? "" : row.contribution}
                          placeholder="0"
                          aria-label={`Contribution at age ${row.age}`}
                          onChange={(e) =>
                            setContribution(
                              row.age,
                              e.target.value === "" ? null : Number(e.target.value) || 0,
                            )
                          }
                          className="w-28 rounded-lg border border-edge bg-surface2 px-2 py-1 text-right tabular-nums outline-none focus:border-accent"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted">
                      {row.income === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        usd(row.income)
                      )}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">{usd(row.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-muted">
            At {targetAge} the fund is{" "}
            <span className="font-semibold text-fg tabular-nums">{usd(atTarget)}</span>
            {house.cost > 0 && (
              <>
                {" — "}
                <span className={`font-medium ${gap >= 0 ? "text-done" : "text-dangerink"}`}>
                  {gap >= 0 ? `${usd(gap)} more than the deposit` : `${usd(-gap)} short`}
                </span>
              </>
            )}
            .
          </p>
        </section>

        {/* Houses worth keeping track of. */}
        <section className="pane mt-5 rounded-2xl border border-edge bg-surface p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-base font-medium">Houses I like</h2>
            <button
              onClick={addListing}
              className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
            >
              <Plus size={15} /> Add a house
            </button>
          </div>

          {house.listings.length === 0 ? (
            <p className="mt-3 text-sm text-faint">
              None yet — add one and keep the address, the listing and what you thought of it.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-edge text-left text-xs tracking-wide text-faint uppercase">
                    <th className="py-2 pr-3 font-medium">Address</th>
                    <th className="py-2 pr-3 font-medium">City</th>
                    <th className="py-2 pr-3 font-medium">State</th>
                    <th className="py-2 pr-3 font-medium">Link</th>
                    <th className="py-2 pr-3 font-medium">Notes</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {house.listings.map((listing) => (
                    <tr key={listing.id} className="border-b border-edge/60 last:border-0">
                      <Cell
                        value={listing.address}
                        placeholder="12 Mill Road"
                        label="Address"
                        onChange={(address) => updateListing(listing.id, { address })}
                      />
                      <Cell
                        value={listing.city}
                        placeholder="City"
                        label="City"
                        onChange={(city) => updateListing(listing.id, { city })}
                        width="w-32"
                      />
                      <Cell
                        value={listing.state}
                        placeholder="State"
                        label="State"
                        onChange={(state) => updateListing(listing.id, { state })}
                        width="w-20"
                      />
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-1.5">
                          <input
                            value={listing.link}
                            placeholder="https://…"
                            aria-label="Link"
                            onChange={(e) => updateListing(listing.id, { link: e.target.value })}
                            className="w-44 rounded-lg border border-edge bg-surface2 px-2 py-1 outline-none focus:border-accent"
                          />
                          {/* Opened in a new tab, so the plan is not navigated away from. */}
                          {listing.link && (
                            <a
                              href={listing.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Open the listing for ${listing.address || "this house"}`}
                              className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-surface2 hover:text-fg"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </span>
                      </td>
                      <Cell
                        value={listing.notes}
                        placeholder="What you thought"
                        label="Notes"
                        onChange={(notes) => updateListing(listing.id, { notes })}
                        width="w-56"
                      />
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteListing(listing.id)}
                          aria-label={`Delete ${listing.address || "this house"}`}
                          className="rounded-lg p-1.5 text-faint transition hover:bg-dangersoft hover:text-dangerink"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** One of the figures at the top: big, and typed straight into. */
function Figure({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="pane block rounded-2xl border border-edge bg-surface p-4 sm:p-5">
      <span className="text-xs font-medium tracking-[0.14em] text-muted uppercase">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        {prefix && <span className="text-2xl text-faint">{prefix}</span>}
        <input
          type="number"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-faint"
        />
        {suffix && <span className="text-2xl text-faint">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

/** A figure that belongs with the table rather than above it. */
function Inline({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-1 rounded-lg border border-edge bg-surface2 px-2 py-1">
      <span>{label}</span>
      {prefix && <span>{prefix}</span>}
      <input
        type="number"
        min={0}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-20 bg-transparent text-right text-sm text-fg tabular-nums outline-none"
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}

function Cell({
  value,
  placeholder,
  label,
  onChange,
  width = "w-40",
}: {
  value: string;
  placeholder: string;
  label: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <td className="py-2 pr-3">
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} rounded-lg border border-edge bg-surface2 px-2 py-1 outline-none focus:border-accent`}
      />
    </td>
  );
}
