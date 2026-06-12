// Weight tracker (spec §6.7, optional). Independent overlay: WeightEntry per
// member over time, charted against the deficit trend (a lightweight inline SVG).
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import { Field } from "../ui";

const today = () => new Date().toISOString().slice(0, 10);

export function WeightPage() {
  const { db, addWeight, deleteWeight } = useDB();
  const members = db.household.members;
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState(80);

  const entries = useMemo(
    () =>
      db.weights
        .filter((w) => w.member_id === memberId)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [db.weights, memberId],
  );

  if (members.length === 0) {
    return (
      <div>
        <h1>Weight</h1>
        <div className="note-box">Add a household member first.</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Weight Tracker</h1>
      <p className="page-sub">Optional overlay — log body weight over time per member.</p>

      <div className="card">
        <div className="row">
          <Field label="Member">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Weight kg">
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(+e.target.value)}
            />
          </Field>
          <button
            className="primary"
            style={{ alignSelf: "flex-end" }}
            onClick={() =>
              addWeight({ id: newId("wt"), member_id: memberId, date, weight_kg: weight })
            }
          >
            Add
          </button>
        </div>
      </div>

      {entries.length > 1 && <WeightChart points={entries.map((e) => ({ date: e.date, kg: e.weight_kg }))} />}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th className="num">kg</th>
              <th className="num">Δ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const delta = i > 0 ? e.weight_kg - entries[i - 1].weight_kg : 0;
              return (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td className="num">{e.weight_kg.toFixed(1)}</td>
                  <td className="num" style={{ color: delta > 0 ? "var(--danger)" : "var(--accent)" }}>
                    {i === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                  </td>
                  <td>
                    <button className="danger btn-sm" onClick={() => deleteWeight(e.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="muted small">
                  No weight entries for this member yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  const W = 640;
  const H = 200;
  const pad = 30;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs) - 0.5;
  const max = Math.max(...kgs) + 0.5;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const y = (kg: number) => H - pad - ((kg - min) / (max - min || 1)) * (H - 2 * pad);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Trend</h2>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--border)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.kg)} r={3} fill="var(--accent)" />
        ))}
        <text x={pad} y={pad - 8} fill="var(--muted)" fontSize={11}>
          {max.toFixed(1)} kg
        </text>
        <text x={pad} y={H - pad + 16} fill="var(--muted)" fontSize={11}>
          {min.toFixed(1)} kg
        </text>
      </svg>
    </div>
  );
}
