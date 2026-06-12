// Logger (spec §6.5). Two cases: "ate X g of a known thing" (look up macros,
// scale, record) and "had a treat" (freeform kcal + optional macros). The plan
// is the ledger; this captures off-menu and ad-hoc intake.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import { scaleProfile } from "../../lib/nutrition";
import { SLOTS, type LogEntry, type Slot } from "../../types";
import { Field } from "../ui";

const today = () => new Date().toISOString().slice(0, 10);

export function LoggerPage() {
  const { db, addLog, deleteLog } = useDB();
  const members = db.household.members;

  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState<Slot>("morning");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [mode, setMode] = useState<"known" | "treat">("known");

  // known-item state
  const [refId, setRefId] = useState(db.ingredients[0]?.id ?? "");
  const [grams, setGrams] = useState(100);

  // treat state
  const [treatNote, setTreatNote] = useState("");
  const [treatKcal, setTreatKcal] = useState(0);
  const [treatP, setTreatP] = useState<number | "">("");
  const [treatC, setTreatC] = useState<number | "">("");
  const [treatF, setTreatF] = useState<number | "">("");

  const knownIngredient = db.ingredients.find((i) => i.id === refId);
  const knownPreview = useMemo(
    () => (knownIngredient ? scaleProfile(knownIngredient.per_100g, grams) : null),
    [knownIngredient, grams],
  );

  const recentLogs = useMemo(
    () => [...db.logs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 25),
    [db.logs],
  );
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const submit = () => {
    if (!memberId) return;
    let entry: LogEntry;
    if (mode === "known") {
      if (!knownIngredient) return;
      const p = scaleProfile(knownIngredient.per_100g, grams);
      entry = {
        id: newId("log"),
        date,
        slot,
        member_id: memberId,
        kind: "adhoc",
        ref: knownIngredient.id,
        grams,
        macros: {
          kcal: Math.round(p.kcal),
          protein: Math.round(p.protein),
          carb: Math.round(p.carb),
          fat: Math.round(p.fat),
        },
        note: knownIngredient.name,
      };
    } else {
      entry = {
        id: newId("log"),
        date,
        slot,
        member_id: memberId,
        kind: "treat",
        macros: {
          kcal: Math.round(treatKcal),
          protein: treatP === "" ? undefined : +treatP,
          carb: treatC === "" ? undefined : +treatC,
          fat: treatF === "" ? undefined : +treatF,
        },
        note: treatNote || "treat",
      };
    }
    addLog(entry);
    // reset treat fields for fast repeat entry
    if (mode === "treat") {
      setTreatNote("");
      setTreatKcal(0);
      setTreatP("");
      setTreatC("");
      setTreatF("");
    }
  };

  if (members.length === 0) {
    return (
      <div>
        <h1>Logger</h1>
        <div className="note-box">Add a household member first to attribute log entries.</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Logger</h1>
      <p className="page-sub">
        The plan already logs itself (use “Log this day” in the Planner). Capture off-menu and ad-hoc
        intake here.
      </p>

      <div className="card">
        <div className="row">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Slot">
            <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Member">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select value={mode} onChange={(e) => setMode(e.target.value as "known" | "treat")}>
              <option value="known">Known item (g)</option>
              <option value="treat">Treat (freeform)</option>
            </select>
          </Field>
        </div>

        {mode === "known" ? (
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Ingredient">
              <select value={refId} onChange={(e) => setRefId(e.target.value)} style={{ minWidth: 220 }}>
                {db.ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grams">
              <input type="number" value={grams} onChange={(e) => setGrams(+e.target.value)} />
            </Field>
            {knownPreview && (
              <div className="muted small" style={{ alignSelf: "flex-end", paddingBottom: 8 }}>
                = {Math.round(knownPreview.kcal)} kcal · P {Math.round(knownPreview.protein)} · C{" "}
                {Math.round(knownPreview.carb)} · F {Math.round(knownPreview.fat)}
              </div>
            )}
          </div>
        ) : (
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Description">
              <input
                value={treatNote}
                onChange={(e) => setTreatNote(e.target.value)}
                placeholder="2 squares dark chocolate"
                style={{ minWidth: 220 }}
              />
            </Field>
            <Field label="kcal">
              <input type="number" value={treatKcal} onChange={(e) => setTreatKcal(+e.target.value)} />
            </Field>
            <Field label="protein g (opt)">
              <input
                type="number"
                value={treatP}
                onChange={(e) => setTreatP(e.target.value === "" ? "" : +e.target.value)}
              />
            </Field>
            <Field label="carb g (opt)">
              <input
                type="number"
                value={treatC}
                onChange={(e) => setTreatC(e.target.value === "" ? "" : +e.target.value)}
              />
            </Field>
            <Field label="fat g (opt)">
              <input
                type="number"
                value={treatF}
                onChange={(e) => setTreatF(e.target.value === "" ? "" : +e.target.value)}
              />
            </Field>
          </div>
        )}

        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <button className="primary" onClick={submit}>
            Add log entry
          </button>
        </div>
      </div>

      <h2>Recent entries</h2>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Slot</th>
              <th>Member</th>
              <th>Kind</th>
              <th>Item</th>
              <th className="num">kcal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td>{e.slot}</td>
                <td>{memberName(e.member_id)}</td>
                <td>
                  <span className="tag">{e.kind}</span>
                </td>
                <td>
                  {e.note}
                  {e.grams ? <span className="muted small"> · {e.grams} g</span> : null}
                </td>
                <td className="num">{e.macros.kcal}</td>
                <td>
                  <button className="danger btn-sm" onClick={() => deleteLog(e.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {recentLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="muted small">
                  No log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
