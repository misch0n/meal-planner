// Household config + daily-needs calculator (spec §6.2, build step 3).
// Per-member profiles with individual targets. BMR / TDEE / macro targets are
// computed deterministically; custom_targets bypass the calculator entirely.
import { useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import { deriveMember, DEFAULT_PROTEIN_G_PER_KG, DEFAULT_CARB_FRACTION } from "../../lib/needs";
import type { Member } from "../../types";
import { Field, MacroDisplay } from "../ui";

const ACTIVITY = [
  { v: 1.2, l: "1.2 — sedentary" },
  { v: 1.375, l: "1.375 — light" },
  { v: 1.55, l: "1.55 — moderate" },
  { v: 1.725, l: "1.725 — active" },
  { v: 1.9, l: "1.9 — very active" },
];

function blankMember(): Member {
  return {
    id: newId("mem"),
    name: "",
    sex: "male",
    age: 30,
    height_cm: 175,
    weight_kg: 75,
    activity_level: 1.55,
    goal: "maintain",
    dietary_tags: [],
  };
}

export function HouseholdPage() {
  const { db, upsertMember, deleteMember } = useDB();
  const [editing, setEditing] = useState<Member | null>(null);

  return (
    <div>
      <h1>Household</h1>
      <p className="page-sub">
        Member profiles drive per-member targets and portioning. Dishes are cooked once but
        portioned per member.
      </p>
      <p className="disclaimer">
        Targets use the Mifflin-St Jeor formula — a general estimate for able-bodied adults, not
        medical advice.
      </p>

      <div className="toolbar">
        <button className="primary" onClick={() => setEditing(blankMember())}>
          + Add member
        </button>
      </div>

      {editing && (
        <MemberEditor
          member={editing}
          onCancel={() => setEditing(null)}
          onSave={(m) => {
            upsertMember(m);
            setEditing(null);
          }}
        />
      )}

      <div className="grid-cards">
        {db.household.members.map((m) => {
          const d = deriveMember(m);
          return (
            <div className="card" key={m.id}>
              <div className="spread">
                <strong>{m.name || "(unnamed)"}</strong>
                <span className="muted small">
                  {m.sex}, {m.age}y · {m.weight_kg}kg
                </span>
              </div>
              <p className="small muted" style={{ margin: "6px 0" }}>
                BMR {d.bmr} · TDEE {d.tdee} · goal {m.goal}
                {m.custom_targets ? " · custom targets" : ""}
              </p>
              <MacroDisplay p={d.targets} />
              {(m.dietary_tags?.length ?? 0) > 0 && (
                <p className="small muted" style={{ marginTop: 8 }}>
                  diet: {m.dietary_tags!.join(", ")}
                </p>
              )}
              <div className="toolbar" style={{ marginTop: 10, marginBottom: 0 }}>
                <button className="btn-sm ghost" onClick={() => setEditing(structuredClone(m))}>
                  Edit
                </button>
                <button className="btn-sm danger" onClick={() => deleteMember(m.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberEditor({
  member,
  onSave,
  onCancel,
}: {
  member: Member;
  onSave: (m: Member) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Member>(member);
  const [useCustom, setUseCustom] = useState(!!member.custom_targets);
  const [dietText, setDietText] = useState((member.dietary_tags ?? []).join(", "));
  const set = (patch: Partial<Member>) => setD((x) => ({ ...x, ...patch }));

  const preview = deriveMember({
    ...d,
    custom_targets: useCustom ? d.custom_targets : undefined,
  });

  const save = () => {
    if (!d.name.trim()) return;
    onSave({
      ...d,
      name: d.name.trim(),
      dietary_tags: dietText.split(",").map((s) => s.trim()).filter(Boolean),
      custom_targets: useCustom ? d.custom_targets : undefined,
    });
  };

  return (
    <div className="card">
      <h2>{member.name ? "Edit member" : "New member"}</h2>
      <div className="row">
        <Field label="Name">
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Sex">
          <select value={d.sex} onChange={(e) => set({ sex: e.target.value as Member["sex"] })}>
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </Field>
        <Field label="Age">
          <input type="number" value={d.age} onChange={(e) => set({ age: +e.target.value })} />
        </Field>
        <Field label="Height cm">
          <input type="number" value={d.height_cm} onChange={(e) => set({ height_cm: +e.target.value })} />
        </Field>
        <Field label="Weight kg">
          <input type="number" value={d.weight_kg} onChange={(e) => set({ weight_kg: +e.target.value })} />
        </Field>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <Field label="Activity level">
          <select
            value={d.activity_level}
            onChange={(e) => set({ activity_level: +e.target.value })}
          >
            {ACTIVITY.map((a) => (
              <option key={a.v} value={a.v}>
                {a.l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Goal">
          <select value={d.goal} onChange={(e) => set({ goal: e.target.value as Member["goal"] })}>
            <option value="deficit">deficit</option>
            <option value="maintain">maintain</option>
            <option value="surplus">surplus</option>
          </select>
        </Field>
        {d.goal !== "maintain" && (
          <Field label={`${d.goal} kcal delta`}>
            <input
              type="number"
              value={d.deficit_kcal ?? 0}
              onChange={(e) => set({ deficit_kcal: +e.target.value })}
            />
          </Field>
        )}
        <Field label={`protein g/kg (default ${DEFAULT_PROTEIN_G_PER_KG})`}>
          <input
            type="number"
            step="0.1"
            value={d.protein_g_per_kg ?? ""}
            placeholder={`${DEFAULT_PROTEIN_G_PER_KG}`}
            onChange={(e) => set({ protein_g_per_kg: e.target.value ? +e.target.value : undefined })}
          />
        </Field>
        <Field label={`carb fraction (default ${DEFAULT_CARB_FRACTION})`}>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={d.carb_fraction ?? ""}
            placeholder={`${DEFAULT_CARB_FRACTION}`}
            onChange={(e) => set({ carb_fraction: e.target.value ? +e.target.value : undefined })}
          />
        </Field>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <Field label="Dietary tags (recipes must satisfy these)">
          <input
            value={dietText}
            onChange={(e) => setDietText(e.target.value)}
            placeholder="vegetarian, vegan"
            style={{ minWidth: 240 }}
          />
        </Field>
      </div>

      <h3 style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            style={{ width: "auto", marginRight: 6 }}
          />
          Use custom targets (bypass calculator)
        </label>
      </h3>
      {useCustom && (
        <div className="row">
          {(["kcal", "protein", "carb", "fat"] as const).map((k) => (
            <Field key={k} label={k}>
              <input
                type="number"
                value={d.custom_targets?.[k] ?? 0}
                onChange={(e) =>
                  set({
                    custom_targets: {
                      kcal: 0,
                      protein: 0,
                      carb: 0,
                      fat: 0,
                      ...d.custom_targets,
                      [k]: +e.target.value,
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
      )}

      <div className="card" style={{ background: "var(--surface-2)", marginTop: 14 }}>
        <p className="small muted" style={{ marginTop: 0 }}>
          Computed: BMR {preview.bmr} · TDEE {preview.tdee}
        </p>
        <MacroDisplay p={preview.targets} />
      </div>

      <div className="toolbar" style={{ marginTop: 14 }}>
        <button className="primary" onClick={save}>
          Save member
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
