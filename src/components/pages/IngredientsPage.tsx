// Ingredient table (spec §6 / build step 1): browse the bundled base products,
// add manual entries, edit conversion data. Base products only — single-component
// foods, the trusted unit of truth.
import { Fragment, useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import type { Ingredient } from "../../types";
import { Field } from "../ui";
import { NUTRIENTS, NUTRIENT_GROUPS, GROUP_LABELS, formatNutrient } from "../../lib/nutrients";

const CATEGORIES = [
  "vegetable",
  "fruit",
  "meat",
  "fish",
  "egg",
  "dairy",
  "fat",
  "grain",
  "legume",
  "nut",
  "herb",
  "spice",
  "sweetener",
  "condiment",
  "beverage",
  "treat",
  "other",
];

function blankIngredient(): Ingredient {
  return {
    id: newId("ing"),
    name: "",
    category: "other",
    source: "manual",
    per_100g: { kcal: 0, protein: 0, carb: 0, fat: 0 },
  };
}

export function IngredientsPage() {
  const { db, upsertIngredient, deleteIngredient } = useDB();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.ingredients
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.name_local?.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      )
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [db.ingredients, query]);

  return (
    <div>
      <h1>Ingredients</h1>
      <p className="page-sub">
        {db.ingredients.length} base products. Single-component foods only — recipes compose over
        these. Nutrition is always per 100 g.
      </p>

      <div className="toolbar">
        <input
          placeholder="Search name / category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <button className="primary" onClick={() => setEditing(blankIngredient())}>
          + Manual ingredient
        </button>
      </div>

      {editing && (
        <IngredientEditor
          ingredient={editing}
          onCancel={() => setEditing(null)}
          onSave={(ing) => {
            upsertIngredient(ing);
            setEditing(null);
          }}
        />
      )}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Source</th>
              <th className="num">kcal</th>
              <th className="num">P</th>
              <th className="num">C</th>
              <th className="num">F</th>
              <th>Conversions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const microCount = Object.keys(i.per_100g).filter(
                (k) => !["kcal", "protein", "carb", "fat"].includes(k),
              ).length;
              const open = expandedId === i.id;
              return (
                <Fragment key={i.id}>
                  <tr>
                    <td>
                      <button
                        className="ghost btn-sm"
                        style={{ border: "none", padding: 0, marginRight: 6 }}
                        onClick={() => setExpandedId(open ? null : i.id)}
                        title="Show full nutrient panel"
                      >
                        {open ? "▾" : "▸"}
                      </button>
                      {i.name}
                      {i.name_local && <span className="muted small"> · {i.name_local}</span>}
                      {microCount > 0 && (
                        <span className="tag" style={{ marginLeft: 6 }}>
                          +{microCount} micros
                        </span>
                      )}
                    </td>
                    <td>{i.category}</td>
                    <td className="muted small">{i.source}</td>
                    <td className="num">{i.per_100g.kcal}</td>
                    <td className="num">{i.per_100g.protein}</td>
                    <td className="num">{i.per_100g.carb}</td>
                    <td className="num">{i.per_100g.fat}</td>
                    <td className="small muted">
                      {i.density_g_per_ml ? `${i.density_g_per_ml} g/ml` : ""}
                      {i.density_g_per_ml && i.piece_weights ? " · " : ""}
                      {i.piece_weights ? Object.keys(i.piece_weights).join(", ") : ""}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="ghost btn-sm" onClick={() => setEditing({ ...i })}>
                        Edit
                      </button>
                      <button className="danger btn-sm" onClick={() => deleteIngredient(i.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={9} style={{ background: "var(--surface-2)" }}>
                        <NutrientPanel ingredient={i} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Read-only grouped breakdown of every nutrient present on an ingredient. */
function NutrientPanel({ ingredient }: { ingredient: Ingredient }) {
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "6px 2px" }}>
      {NUTRIENT_GROUPS.map((group) => {
        const rows = NUTRIENTS.filter(
          (n) => n.group === group && typeof ingredient.per_100g[n.key] === "number",
        );
        if (rows.length === 0) return null;
        return (
          <div key={group} style={{ minWidth: 180 }}>
            <h4 style={{ margin: "2px 0 6px", fontSize: 11, color: "var(--muted)" }}>
              {GROUP_LABELS[group]}
            </h4>
            {rows.map((n) => (
              <div key={n.key} className="spread small" style={{ gap: 16 }}>
                <span className="muted">{n.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatNutrient(n.key, ingredient.per_100g[n.key] as number)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function IngredientEditor({
  ingredient,
  onSave,
  onCancel,
}: {
  ingredient: Ingredient;
  onSave: (i: Ingredient) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Ingredient>(ingredient);
  const [pieceText, setPieceText] = useState(
    ingredient.piece_weights
      ? Object.entries(ingredient.piece_weights)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : "",
  );

  const set = (patch: Partial<Ingredient>) => setDraft((d) => ({ ...d, ...patch }));
  const setNutrient = (k: string, raw: string) =>
    setDraft((d) => {
      const per = { ...d.per_100g };
      if (raw === "") {
        if (k === "kcal" || k === "protein" || k === "carb" || k === "fat") per[k] = 0;
        else delete per[k];
      } else {
        per[k] = +raw;
      }
      return { ...d, per_100g: per };
    });

  const save = () => {
    if (!draft.name.trim()) return;
    const piece_weights = parsePieces(pieceText);
    onSave({
      ...draft,
      name: draft.name.trim(),
      piece_weights: Object.keys(piece_weights).length ? piece_weights : undefined,
      density_g_per_ml: draft.density_g_per_ml || undefined,
    });
  };

  return (
    <div className="card">
      <h2>{ingredient.name ? "Edit ingredient" : "New manual ingredient"}</h2>
      <div className="row">
        <Field label="Name">
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Local name (optional)">
          <input
            value={draft.name_local ?? ""}
            onChange={(e) => set({ name_local: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <select value={draft.category} onChange={(e) => set({ category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <h3>Nutrition — per 100 g</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Macros are required; leave any micronutrient blank for “no data”.
      </p>
      {NUTRIENT_GROUPS.map((group) => (
        <div key={group} style={{ marginBottom: 10 }}>
          <h4 style={{ margin: "8px 0 4px", fontSize: 12, color: "var(--muted)" }}>
            {GROUP_LABELS[group]}
          </h4>
          <div className="row">
            {NUTRIENTS.filter((n) => n.group === group).map((n) => {
              const v = draft.per_100g[n.key];
              return (
                <Field key={n.key} label={`${n.label} (${n.unit})`}>
                  <input
                    type="number"
                    step="any"
                    style={{ width: 96 }}
                    value={v ?? ""}
                    onChange={(e) => setNutrient(n.key, e.target.value)}
                  />
                </Field>
              );
            })}
          </div>
        </div>
      ))}

      <h3>Conversions (optional)</h3>
      <div className="row">
        <Field label="density g/ml (for volume→mass)">
          <input
            type="number"
            step="0.01"
            value={draft.density_g_per_ml ?? ""}
            onChange={(e) =>
              set({ density_g_per_ml: e.target.value ? +e.target.value : undefined })
            }
          />
        </Field>
        <Field label="piece weights, e.g. clove=5, medium=110">
          <input
            value={pieceText}
            onChange={(e) => setPieceText(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </Field>
      </div>

      <div className="toolbar" style={{ marginTop: 14 }}>
        <button className="primary" onClick={save}>
          Save
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function parsePieces(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of text.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v && !Number.isNaN(+v)) out[k] = +v;
  }
  return out;
}
