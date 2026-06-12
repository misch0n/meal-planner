// ─────────────────────────────────────────────────────────────────────────────
// Recipe analytics (spec §6.1). Pure deterministic arithmetic — no LLM in the
// numeric path. Sum ingredient macros × (grams / 100), aggregate, scale.
// ─────────────────────────────────────────────────────────────────────────────
import type { Ingredient, NutrientProfile, Recipe } from "../types";

export type IngredientIndex = Map<string, Ingredient>;

export function indexIngredients(ingredients: Ingredient[]): IngredientIndex {
  return new Map(ingredients.map((i) => [i.id, i]));
}

/** Empty profile to fold into. */
function emptyProfile(): NutrientProfile {
  return { kcal: 0, protein: 0, carb: 0, fat: 0 };
}

/** Scale a per-100g profile to `grams`, returning absolute amounts. */
export function scaleProfile(per100g: NutrientProfile, grams: number): NutrientProfile {
  const factor = grams / 100;
  const out: NutrientProfile = emptyProfile();
  for (const [k, v] of Object.entries(per100g)) {
    if (typeof v === "number") out[k] = v * factor;
  }
  return out;
}

/** Add `b` into `a` in place and return `a`. Handles arbitrary micro keys. */
export function addProfile(a: NutrientProfile, b: NutrientProfile): NutrientProfile {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === "number") a[k] = (a[k] ?? 0) + v;
  }
  return a;
}

/**
 * Full macro/micro profile for one base serving of a recipe (servings_base = 1).
 * Unknown ingredient ids are skipped silently (they contribute nothing) but are
 * also reported so the UI can warn.
 */
export function analyzeRecipe(
  recipe: Recipe,
  index: IngredientIndex,
): { profile: NutrientProfile; missing: string[] } {
  const profile = emptyProfile();
  const missing: string[] = [];
  for (const ri of recipe.ingredients) {
    const ing = index.get(ri.ingredient_id);
    if (!ing) {
      missing.push(ri.ingredient_id);
      continue;
    }
    addProfile(profile, scaleProfile(ing.per_100g, ri.grams));
  }
  return { profile, missing };
}

/** Recipe profile scaled by a portion multiplier (e.g. per-member portion). */
export function recipeProfileScaled(
  recipe: Recipe,
  index: IngredientIndex,
  portion: number,
): NutrientProfile {
  const { profile } = analyzeRecipe(recipe, index);
  return scaleProfile100ToFactor(profile, portion);
}

/** Multiply every nutrient by a raw factor (not per-100g). */
export function scaleProfile100ToFactor(p: NutrientProfile, factor: number): NutrientProfile {
  const out = emptyProfile();
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "number") out[k] = v * factor;
  }
  return out;
}

export function totalGrams(recipe: Recipe): number {
  return recipe.ingredients.reduce((s, ri) => s + ri.grams, 0);
}

export function roundProfile(p: NutrientProfile, digits = 1): NutrientProfile {
  const f = 10 ** digits;
  const out: NutrientProfile = emptyProfile();
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "number") out[k] = Math.round(v * f) / f;
  }
  return out;
}
