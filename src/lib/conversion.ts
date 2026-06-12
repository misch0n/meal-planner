// ─────────────────────────────────────────────────────────────────────────────
// Conversion Engine (spec §5). Two independent mechanisms, both resolving to
// grams. Density and piece weights are optional per-ingredient fields; an
// ingredient works fine grams-only if neither exists.
// ─────────────────────────────────────────────────────────────────────────────
import type { Ingredient } from "../types";

export type UnitKind = "g" | "ml" | "piece";

/** volume → mass: grams = ml × density */
export function mlToGrams(ml: number, ingredient: Ingredient): number | null {
  if (ingredient.density_g_per_ml == null) return null;
  return ml * ingredient.density_g_per_ml;
}

export function gramsToMl(grams: number, ingredient: Ingredient): number | null {
  if (!ingredient.density_g_per_ml) return null;
  return grams / ingredient.density_g_per_ml;
}

/** piece → mass: grams = count × piece_weights[label] */
export function piecesToGrams(
  count: number,
  label: string,
  ingredient: Ingredient,
): number | null {
  const w = ingredient.piece_weights?.[label];
  if (w == null) return null;
  return count * w;
}

export function gramsToPieces(
  grams: number,
  label: string,
  ingredient: Ingredient,
): number | null {
  const w = ingredient.piece_weights?.[label];
  if (!w) return null;
  return grams / w;
}

export function pieceLabels(ingredient: Ingredient): string[] {
  return ingredient.piece_weights ? Object.keys(ingredient.piece_weights) : [];
}

export function supportsVolume(ingredient: Ingredient): boolean {
  return ingredient.density_g_per_ml != null;
}

export function supportsPieces(ingredient: Ingredient): boolean {
  return !!ingredient.piece_weights && Object.keys(ingredient.piece_weights).length > 0;
}

/**
 * Resolve any supported input to grams. `label` is required for piece input.
 * Returns null when the ingredient lacks the data for the requested unit.
 */
export function toGrams(
  amount: number,
  unit: UnitKind,
  ingredient: Ingredient,
  label?: string,
): number | null {
  switch (unit) {
    case "g":
      return amount;
    case "ml":
      return mlToGrams(amount, ingredient);
    case "piece":
      return label ? piecesToGrams(amount, label, ingredient) : null;
  }
}
