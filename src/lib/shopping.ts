// ─────────────────────────────────────────────────────────────────────────────
// Shopping list output (spec §6.4). Aggregate every planned recipe × every
// member's portion → sum grams per base ingredient across the plan → grouped by
// category. This is the handoff artifact (manual or ebag MCP downstream).
// ─────────────────────────────────────────────────────────────────────────────
import type { Ingredient, MealPlan, Recipe } from "../types";
import type { IngredientIndex } from "./nutrition";

export interface ShoppingLine {
  ingredient_id: string;
  name: string;
  name_local?: string;
  category: string;
  grams: number;
}

export interface ShoppingGroup {
  category: string;
  lines: ShoppingLine[];
  grams: number;
}

export function buildShoppingList(
  plan: MealPlan,
  recipes: Recipe[],
  index: IngredientIndex,
): { groups: ShoppingGroup[]; missing: string[] } {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const gramsByIngredient = new Map<string, number>();
  const missing = new Set<string>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const recipe = recipeById.get(meal.recipe_id);
      if (!recipe) {
        missing.add(meal.recipe_id);
        continue;
      }
      const totalPortion = Object.values(meal.portions).reduce((s, p) => s + p, 0);
      if (totalPortion <= 0) continue;
      for (const ri of recipe.ingredients) {
        const add = ri.grams * totalPortion;
        gramsByIngredient.set(ri.ingredient_id, (gramsByIngredient.get(ri.ingredient_id) ?? 0) + add);
      }
    }
  }

  const byCategory = new Map<string, ShoppingLine[]>();
  for (const [id, grams] of gramsByIngredient) {
    const ing: Ingredient | undefined = index.get(id);
    const category = ing?.category ?? "uncategorized";
    const line: ShoppingLine = {
      ingredient_id: id,
      name: ing?.name ?? id,
      name_local: ing?.name_local,
      category,
      grams: Math.round(grams),
    };
    if (!ing) missing.add(id);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(line);
  }

  const groups: ShoppingGroup[] = [...byCategory.entries()]
    .map(([category, lines]) => ({
      category,
      lines: lines.sort((a, b) => a.name.localeCompare(b.name)),
      grams: lines.reduce((s, l) => s + l.grams, 0),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return { groups, missing: [...missing] };
}

/** Plain-text export of a shopping list (the handoff artifact). */
export function shoppingListToText(groups: ShoppingGroup[]): string {
  const lines: string[] = ["# Shopping List", ""];
  for (const g of groups) {
    lines.push(`## ${g.category} (${formatGrams(g.grams)})`);
    for (const l of g.lines) {
      const local = l.name_local ? ` / ${l.name_local}` : "";
      lines.push(`- ${l.name}${local}: ${formatGrams(l.grams)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}
