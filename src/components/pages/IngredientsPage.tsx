// Ingredient table (spec §6 / build step 1): browse the bundled base products,
// add manual entries, edit conversion data. Base products only — single-component
// foods, the trusted unit of truth.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import type { Ingredient } from "../../types";
import { Field } from "../ui";

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
  "sweetener",
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
            {filtered.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.name}
                  {i.name_local && <span className="muted small"> · {i.name_local}</span>}
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
                <td>
                  <button className="ghost btn-sm" onClick={() => setEditing({ ...i })}>
                    Edit
                  </button>
                  <button className="danger btn-sm" onClick={() => deleteIngredient(i.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const setMacro = (k: string, v: number) =>
    setDraft((d) => ({ ...d, per_100g: { ...d.per_100g, [k]: v } }));

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
      <div className="row">
        <Field label="kcal">
          <input
            type="number"
            value={draft.per_100g.kcal}
            onChange={(e) => setMacro("kcal", +e.target.value)}
          />
        </Field>
        <Field label="protein g">
          <input
            type="number"
            value={draft.per_100g.protein}
            onChange={(e) => setMacro("protein", +e.target.value)}
          />
        </Field>
        <Field label="carb g">
          <input
            type="number"
            value={draft.per_100g.carb}
            onChange={(e) => setMacro("carb", +e.target.value)}
          />
        </Field>
        <Field label="fat g">
          <input
            type="number"
            value={draft.per_100g.fat}
            onChange={(e) => setMacro("fat", +e.target.value)}
          />
        </Field>
        <Field label="fiber g">
          <input
            type="number"
            value={draft.per_100g.fiber ?? 0}
            onChange={(e) => setMacro("fiber", +e.target.value)}
          />
        </Field>
      </div>

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
