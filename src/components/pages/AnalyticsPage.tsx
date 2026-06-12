// Analytics & deficit (spec §6.6). Roll up LogEntry macros over a range vs.
// computed targets. Ranges, slot filters, per-member & household views, deficit.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { computeTargets } from "../../lib/needs";
import { dateRange, deficitSeries, rollup, type RangeFilter } from "../../lib/analytics";
import { SLOTS, type Slot } from "../../types";
import { TargetBar } from "../ui";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const { db } = useDB();
  const members = db.household.members;

  const [start, setStart] = useState(isoDaysAgo(6));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [scope, setScope] = useState<string>("household"); // member id or "household"
  const [slotFilter, setSlotFilter] = useState<Slot | "all">("all");

  const memberIds = scope === "household" ? members.map((m) => m.id) : [scope];
  const slots = slotFilter === "all" ? undefined : [slotFilter];
  const dayCount = useMemo(() => dateRange(start, end).length, [start, end]);

  const filter: RangeFilter = { start, end, member_ids: memberIds, slots };
  const consumed = useMemo(() => rollup(db.logs, filter), [db.logs, start, end, scope, slotFilter]);

  // Aggregate target across the selected members × days.
  const dailyTarget = members
    .filter((m) => memberIds.includes(m.id))
    .reduce(
      (acc, m) => {
        const t = computeTargets(m);
        acc.kcal += t.kcal;
        acc.protein += t.protein;
        acc.carb += t.carb;
        acc.fat += t.fat;
        return acc;
      },
      { kcal: 0, protein: 0, carb: 0, fat: 0 },
    );
  const periodTarget = {
    kcal: dailyTarget.kcal * dayCount,
    protein: dailyTarget.protein * dayCount,
    carb: dailyTarget.carb * dayCount,
    fat: dailyTarget.fat * dayCount,
  };

  const deficit = periodTarget.kcal - consumed.kcal;

  // Per-member cumulative deficit series (only meaningful for single member).
  const focusMember = scope !== "household" ? members.find((m) => m.id === scope) : null;
  const series = focusMember ? deficitSeries(db.logs, focusMember, dateRange(start, end), slots) : [];

  if (members.length === 0) {
    return (
      <div>
        <h1>Analytics</h1>
        <div className="note-box">Add a household member to compute targets and deficits.</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Analytics</h1>
      <p className="page-sub">
        Consumed (from the log) vs. computed targets over a range. Deficit = target − consumed,
        surfaced cumulatively.
      </p>

      <div className="card">
        <div className="row">
          <div className="col">
            <label>From</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="col">
            <label>To</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="col">
            <label>Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="household">Household (all)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <label>Slot</label>
            <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value as Slot | "all")}>
              <option value="all">all</option>
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          {dayCount} day(s) · {consumed.entries} log entries
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Consumed vs. target (period total)</h2>
        <TargetBar label="kcal" value={consumed.kcal} target={periodTarget.kcal} kind="kcal" />
        <TargetBar label="protein" value={consumed.protein} target={periodTarget.protein} kind="protein" />
        <TargetBar label="carb" value={consumed.carb} target={periodTarget.carb} kind="carb" />
        <TargetBar label="fat" value={consumed.fat} target={periodTarget.fat} kind="fat" />
        <p style={{ marginBottom: 0 }}>
          Cumulative energy deficit:{" "}
          <strong style={{ color: deficit >= 0 ? "var(--accent)" : "var(--danger)" }}>
            {Math.round(deficit)} kcal {deficit >= 0 ? "under" : "over"} target
          </strong>
        </p>
      </div>

      {focusMember && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Daily deficit — {focusMember.name}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Target</th>
                <th className="num">Consumed</th>
                <th className="num">Daily Δ</th>
                <th className="num">Cumulative Δ</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td className="num">{p.targetKcal}</td>
                  <td className="num">{p.consumedKcal}</td>
                  <td className="num" style={{ color: p.dailyDeficit >= 0 ? "var(--accent)" : "var(--danger)" }}>
                    {p.dailyDeficit >= 0 ? "+" : ""}
                    {Math.round(p.dailyDeficit)}
                  </td>
                  <td className="num">{Math.round(p.cumulativeDeficit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scope === "household" && (
        <p className="small muted">
          Select a single member above to see the per-day cumulative deficit table.
        </p>
      )}
    </div>
  );
}
