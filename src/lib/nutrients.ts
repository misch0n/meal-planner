// ─────────────────────────────────────────────────────────────────────────────
// Canonical nutrient schema. Every nutrient stored on an ingredient's `per_100g`
// uses one of these keys, so the curated dataset, the USDA build script, and the
// UI all agree on names, units, and grouping.
//
// Macros are always-present (kcal/protein/carb/fat); everything else is optional
// and simply omitted when a reputable value isn't available.
// ─────────────────────────────────────────────────────────────────────────────

export type NutrientUnit = "kcal" | "g" | "mg" | "µg";
export type NutrientGroup = "macro" | "lipid" | "mineral" | "vitamin";

export interface NutrientMeta {
  key: string;
  label: string;
  unit: NutrientUnit;
  group: NutrientGroup;
}

// Order here is the display order within each group.
export const NUTRIENTS: NutrientMeta[] = [
  // Macros
  { key: "kcal", label: "Energy", unit: "kcal", group: "macro" },
  { key: "protein", label: "Protein", unit: "g", group: "macro" },
  { key: "carb", label: "Carbohydrate", unit: "g", group: "macro" },
  { key: "fat", label: "Total fat", unit: "g", group: "macro" },
  { key: "fiber", label: "Fiber", unit: "g", group: "macro" },
  { key: "sugar", label: "Sugars", unit: "g", group: "macro" },

  // Lipid detail
  { key: "sat_fat", label: "Saturated fat", unit: "g", group: "lipid" },
  { key: "mono_fat", label: "Monounsaturated fat", unit: "g", group: "lipid" },
  { key: "poly_fat", label: "Polyunsaturated fat", unit: "g", group: "lipid" },
  { key: "trans_fat", label: "Trans fat", unit: "g", group: "lipid" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", group: "lipid" },

  // Minerals
  { key: "sodium", label: "Sodium", unit: "mg", group: "mineral" },
  { key: "potassium", label: "Potassium", unit: "mg", group: "mineral" },
  { key: "calcium", label: "Calcium", unit: "mg", group: "mineral" },
  { key: "iron", label: "Iron", unit: "mg", group: "mineral" },
  { key: "magnesium", label: "Magnesium", unit: "mg", group: "mineral" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", group: "mineral" },
  { key: "zinc", label: "Zinc", unit: "mg", group: "mineral" },
  { key: "copper", label: "Copper", unit: "mg", group: "mineral" },
  { key: "manganese", label: "Manganese", unit: "mg", group: "mineral" },
  { key: "selenium", label: "Selenium", unit: "µg", group: "mineral" },

  // Vitamins
  { key: "vit_a_rae", label: "Vitamin A (RAE)", unit: "µg", group: "vitamin" },
  { key: "vit_c", label: "Vitamin C", unit: "mg", group: "vitamin" },
  { key: "vit_d", label: "Vitamin D", unit: "µg", group: "vitamin" },
  { key: "vit_e", label: "Vitamin E", unit: "mg", group: "vitamin" },
  { key: "vit_k", label: "Vitamin K", unit: "µg", group: "vitamin" },
  { key: "thiamin", label: "Thiamin (B1)", unit: "mg", group: "vitamin" },
  { key: "riboflavin", label: "Riboflavin (B2)", unit: "mg", group: "vitamin" },
  { key: "niacin", label: "Niacin (B3)", unit: "mg", group: "vitamin" },
  { key: "vit_b6", label: "Vitamin B6", unit: "mg", group: "vitamin" },
  { key: "folate", label: "Folate", unit: "µg", group: "vitamin" },
  { key: "vit_b12", label: "Vitamin B12", unit: "µg", group: "vitamin" },
];

export const NUTRIENT_BY_KEY: Map<string, NutrientMeta> = new Map(
  NUTRIENTS.map((n) => [n.key, n]),
);

export const MACRO_KEYS = ["kcal", "protein", "carb", "fat"] as const;

export const GROUP_LABELS: Record<NutrientGroup, string> = {
  macro: "Macronutrients",
  lipid: "Fats & cholesterol",
  mineral: "Minerals",
  vitamin: "Vitamins",
};

export const NUTRIENT_GROUPS: NutrientGroup[] = ["macro", "lipid", "mineral", "vitamin"];

/** Format a nutrient amount with its unit, trimming trailing zeros. */
export function formatNutrient(key: string, amount: number): string {
  const meta = NUTRIENT_BY_KEY.get(key);
  const unit = meta?.unit ?? "";
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100;
  return `${rounded} ${unit}`.trim();
}
