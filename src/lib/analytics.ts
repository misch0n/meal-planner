// ─────────────────────────────────────────────────────────────────────────────
// Analytics & deficit (spec §6.6). Roll up LogEntry macros over a range vs.
// computed targets. Ranges, slot filters, per-member & household views, deficit.
// ─────────────────────────────────────────────────────────────────────────────
import type { LogEntry, Member, Slot } from "../types";
import { computeTargets } from "./needs";

export interface Rollup {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  entries: number;
}

export interface RangeFilter {
  start?: string; // ISO inclusive
  end?: string; // ISO inclusive
  slots?: Slot[]; // if set, only these slots
  member_ids?: string[]; // if set, only these members
  kinds?: LogEntry["kind"][];
}

function inRange(entry: LogEntry, f: RangeFilter): boolean {
  if (f.start && entry.date < f.start) return false;
  if (f.end && entry.date > f.end) return false;
  if (f.slots && !f.slots.includes(entry.slot)) return false;
  if (f.member_ids && !f.member_ids.includes(entry.member_id)) return false;
  if (f.kinds && !f.kinds.includes(entry.kind)) return false;
  return true;
}

export function rollup(logs: LogEntry[], filter: RangeFilter = {}): Rollup {
  const out: Rollup = { kcal: 0, protein: 0, carb: 0, fat: 0, entries: 0 };
  for (const e of logs) {
    if (!inRange(e, filter)) continue;
    out.kcal += e.macros.kcal;
    out.protein += e.macros.protein ?? 0;
    out.carb += e.macros.carb ?? 0;
    out.fat += e.macros.fat ?? 0;
    out.entries += 1;
  }
  out.kcal = Math.round(out.kcal);
  out.protein = Math.round(out.protein);
  out.carb = Math.round(out.carb);
  out.fat = Math.round(out.fat);
  return out;
}

/** Group rollups by day for a member (or household if member_ids spans many). */
export function rollupByDay(logs: LogEntry[], filter: RangeFilter = {}): Map<string, Rollup> {
  const byDay = new Map<string, LogEntry[]>();
  for (const e of logs) {
    if (!inRange(e, filter)) continue;
    if (!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date)!.push(e);
  }
  const out = new Map<string, Rollup>();
  for (const [date, entries] of [...byDay.entries()].sort()) {
    out.set(date, rollup(entries));
  }
  return out;
}

export interface DeficitPoint {
  date: string;
  targetKcal: number;
  consumedKcal: number;
  dailyDeficit: number; // target - consumed (positive = under target)
  cumulativeDeficit: number;
}

/**
 * Cumulative deficit over a date span for a single member. `dates` should be the
 * ordered list of days to report (so zero-consumption days still appear).
 * deficit = target_kcal − consumed_kcal, surfaced cumulatively.
 */
export function deficitSeries(
  logs: LogEntry[],
  member: Member,
  dates: string[],
  slots?: Slot[],
): DeficitPoint[] {
  const target = computeTargets(member).kcal;
  const byDay = rollupByDay(logs, { member_ids: [member.id], slots });
  let cumulative = 0;
  return dates.map((date) => {
    const consumed = byDay.get(date)?.kcal ?? 0;
    const daily = target - consumed;
    cumulative += daily;
    return { date, targetKcal: target, consumedKcal: consumed, dailyDeficit: daily, cumulativeDeficit: cumulative };
  });
}

/** Inclusive list of ISO dates between start and end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
