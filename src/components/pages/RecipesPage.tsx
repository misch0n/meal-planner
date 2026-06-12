// Recipe composer + live analytics (spec §6.1, build step 2). Enter ingredient
// amounts via grams, volume, or pieces — all convert to grams on save. Live
// macro/micro profile doubles as a standalone recipe analyzer.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import { analyzeRecipe, roundProfile, totalGrams } from "../../lib/nutrition";
import { pieceLabels, supportsPieces, supportsVolume, toGrams, type UnitKind } from "../../lib/conversion";
import type { Recipe, RecipeIngredient } from "../../types";
import { Field, MacroDisplay, Tags } from "../ui";

function blankRecipe(): Recipe {
  return { id: newId("rec"), name: "", tags: [], steps: [], servings_base: 1, ingredients: [] };
}

export function RecipesPage() {
  const { db, upsertRecipe, deleteRecipe, index } = useDB();
  const [editing, setEditing] = useState<Recipe | null>(null);

  const recipes = useMemo(
    () => [...db.recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [db.recipes],
  );

  if (editing) {
    return (
      <RecipeEditor
        recipe={editing}
        onCancel={() => setEditing(null)}
        onSave={(r) => {
          upsertRecipe(r);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div>
      <h1>Recipes</h1>
      <p className="page-sub">
        {recipes.length} recipes, each defined per-1-person in grams. Profiles below are computed
        deterministically from the ingredient table.
      </p>
      <div className="toolbar">
        <button className="primary" onClick={() => setEditing(blankRecipe())}>
          + New recipe
        </button>
      </div>

      <div className="grid-cards">
        {recipes.map((r) => {
          const { profile, missing } = analyzeRecipe(r, index);
          return (
            <div className="card" key={r.id}>
              <div className="spread">
                <strong>{r.name}</strong>
                <span className="muted small">{Math.round(totalGrams(r))} g</span>
              </div>
              <div style={{ margin: "8px 0" }}>
                <Tags tags={r.tags} />
              </div>
              <MacroDisplay p={roundProfile(profile)} />
              {missing.length > 0 && (
                <p className="small" style={{ color: "var(--warn)" }}>
                  ⚠ {missing.length} ingredient(s) not in table
                </p>
              )}
              <div className="toolbar" style={{ marginTop: 10, marginBottom: 0 }}>
                <button className="btn-sm ghost" onClick={() => setEditing(structuredClone(r))}>
                  Edit
                </button>
                <button className="btn-sm danger" onClick={() => deleteRecipe(r.id)}>
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

function RecipeEditor({
  recipe,
  onSave,
  onCancel,
}: {
  recipe: Recipe;
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const { db, index } = useDB();
  const [draft, setDraft] = useState<Recipe>(recipe);
  const [tagText, setTagText] = useState(recipe.tags.join(", "));
  const [stepText, setStepText] = useState(recipe.steps.join("\n"));

  // Add-ingredient form state with unit conversion.
  const [pickId, setPickId] = useState(db.ingredients[0]?.id ?? "");
  const [unit, setUnit] = useState<UnitKind>("g");
  const [amount, setAmount] = useState(100);
  const [pieceLabel, setPieceLabel] = useState("");

  const pickIng = db.ingredients.find((i) => i.id === pickId);
  const live = useMemo(() => analyzeRecipe(draft, index), [draft, index]);

  const addIngredient = () => {
    if (!pickIng) return;
    const grams = toGrams(amount, unit, pickIng, pieceLabel || undefined);
    if (grams == null || grams <= 0) return;
    const existing = draft.ingredients.find((ri) => ri.ingredient_id === pickId);
    let ingredients: RecipeIngredient[];
    if (existing) {
      ingredients = draft.ingredients.map((ri) =>
        ri.ingredient_id === pickId ? { ...ri, grams: ri.grams + Math.round(grams) } : ri,
      );
    } else {
      ingredients = [...draft.ingredients, { ingredient_id: pickId, grams: Math.round(grams) }];
    }
    setDraft({ ...draft, ingredients });
  };

  const updateGrams = (ingredient_id: string, grams: number) =>
    setDraft({
      ...draft,
      ingredients: draft.ingredients.map((ri) =>
        ri.ingredient_id === ingredient_id ? { ...ri, grams } : ri,
      ),
    });

  const removeIngredient = (ingredient_id: string) =>
    setDraft({
      ...draft,
      ingredients: draft.ingredients.filter((ri) => ri.ingredient_id !== ingredient_id),
    });

  const save = () => {
    if (!draft.name.trim()) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      tags: tagText.split(",").map((t) => t.trim()).filter(Boolean),
      steps: stepText.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  };

  const labels = pickIng ? pieceLabels(pickIng) : [];

  return (
    <div>
      <h1>{recipe.name ? "Edit recipe" : "New recipe"}</h1>
      <div className="card">
        <div className="row">
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              style={{ minWidth: 260 }}
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="vegetarian, high-protein, quick"
              style={{ minWidth: 280 }}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <h2>Ingredients (stored in grams)</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <Field label="Ingredient">
            <select value={pickId} onChange={(e) => setPickId(e.target.value)} style={{ minWidth: 220 }}>
              {db.ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
          </Field>
          <Field label="Unit">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitKind)}
            >
              <option value="g">grams</option>
              {pickIng && supportsVolume(pickIng) && <option value="ml">millilitres</option>}
              {pickIng && supportsPieces(pickIng) && <option value="piece">pieces</option>}
            </select>
          </Field>
          {unit === "piece" && (
            <Field label="Piece">
              <select value={pieceLabel} onChange={(e) => setPieceLabel(e.target.value)}>
                <option value="">—</option>
                {labels.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
          )}
          <button className="primary" style={{ alignSelf: "flex-end" }} onClick={addIngredient}>
            Add
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th className="num">grams</th>
              <th className="num">kcal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {draft.ingredients.map((ri) => {
              const ing = index.get(ri.ingredient_id);
              const kcal = ing ? Math.round((ing.per_100g.kcal * ri.grams) / 100) : 0;
              return (
                <tr key={ri.ingredient_id}>
                  <td>{ing?.name ?? `⚠ ${ri.ingredient_id}`}</td>
                  <td className="num">
                    <input
                      type="number"
                      value={ri.grams}
                      style={{ width: 90 }}
                      onChange={(e) => updateGrams(ri.ingredient_id, +e.target.value)}
                    />
                  </td>
                  <td className="num">{kcal}</td>
                  <td>
                    <button className="danger btn-sm" onClick={() => removeIngredient(ri.ingredient_id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {draft.ingredients.length === 0 && (
              <tr>
                <td colSpan={4} className="muted small">
                  No ingredients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Live profile (per 1 serving)</h2>
        <MacroDisplay p={roundProfile(live.profile)} />
        {live.missing.length > 0 && (
          <p className="small" style={{ color: "var(--warn)" }}>
            ⚠ Missing from table: {live.missing.join(", ")}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Steps (one per line)</h2>
        <textarea value={stepText} onChange={(e) => setStepText(e.target.value)} />
      </div>

      <div className="toolbar">
        <button className="primary" onClick={save}>
          Save recipe
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
