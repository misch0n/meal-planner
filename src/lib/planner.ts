// ─────────────────────────────────────────────────────────────────────────────
// Planner (spec §6.3). Per-member, constrained random.
//
//   variety  ← randomness in recipe selection
//   precision ← per-member portion scaling to hit macro targets
//
// The algorithm owns ALL the math. No LLM here. Portion bounds (§10 decision):
// 0.5×–2.0×. A member-day that cannot be balanced within those bounds is
// SURFACED as unbalanceable rather than silently over-portioned.
// ─────────────────────────────────────────────────────────────────────────────
import type { Member, MealPlan, PlannedMeal, Recipe, Slot } from "../types";
import { SLOTS } from "../types";
import { analyzeRecipe, type IngredientIndex } from "./nutrition";
import { computeTargets } from "./needs";

export const MIN_PORTION = 0.5;
export const MAX_PORTION = 2.0;
/** Acceptable kcal band around target when uniform scaling lands out of bounds. */
export const KCAL_TOLERANCE = 0.001;

// Small deterministic PRNG so a plan can be regenerated reproducibly from a seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A recipe is compatible with a member if it carries every dietary tag the
 *  member requires (e.g. member needs "vegetarian" → recipe.tags must include it). */
export function recipeCompatible(recipe: Recipe, member: Member): boolean {
  const required = member.dietary_tags ?? [];
  return required.every((t) => recipe.tags.includes(t));
}

/** Candidates for a cooked-once meal: recipes compatible with EVERY member. */
export function candidatesForHousehold(recipes: Recipe[], members: Member[]): Recipe[] {
  return recipes.filter((r) => members.every((m) => recipeCompatible(r, m)));
}

export interface BalanceResult {
  portion: number;
  balanced: boolean;
  reason?: string;
}

/**
 * Pick a single uniform portion multiplier for a member's day so that their
 * total kcal across the day's meals equals their target, if achievable within
 * [MIN_PORTION, MAX_PORTION]. Uniform scaling lands kcal exactly on target when
 * in-bounds; out of bounds → unbalanceable.
 */
export function balanceMemberDay(
  dayRecipes: Recipe[],
  index: IngredientIndex,
  member: Member,
): BalanceResult {
  const target = computeTargets(member).kcal;
  const baseKcal = dayRecipes.reduce((s, r) => s + analyzeRecipe(r, index).profile.kcal, 0);

  if (baseKcal <= 0) {
    return { portion: 1, balanced: false, reason: "Day has no caloric content to scale." };
  }
  const scale = target / baseKcal;
  if (scale < MIN_PORTION - KCAL_TOLERANCE) {
    return {
      portion: MIN_PORTION,
      balanced: false,
      reason: `Target ${target} kcal needs ${scale.toFixed(2)}× — below ${MIN_PORTION}× floor (meals too large).`,
    };
  }
  if (scale > MAX_PORTION + KCAL_TOLERANCE) {
    return {
      portion: MAX_PORTION,
      balanced: false,
      reason: `Target ${target} kcal needs ${scale.toFixed(2)}× — above ${MAX_PORTION}× cap (meals too small).`,
    };
  }
  return { portion: Math.round(scale * 100) / 100, balanced: true };
}

export interface GenerateOptions {
  seed?: number;
  /** ISO dates to fill (one PlanDay each). */
  dates: string[];
}

export interface UnbalanceableNote {
  date: string;
  member_id: string;
  reason: string;
}

export interface GenerateResult {
  plan: MealPlan;
  unbalanceable: UnbalanceableNote[];
}

/**
 * Generate a week (or any set of dates) of meals. Recipes are chosen per slot
 * with a soft preference for ingredient overlap across the week (less waste).
 * Portions are then set per member per day.
 */
export function generatePlan(
  recipes: Recipe[],
  members: Member[],
  index: IngredientIndex,
  opts: GenerateOptions,
): GenerateResult {
  const seed = opts.seed ?? (Date.now() & 0xffffffff);
  const rng = mulberry32(seed);
  const pool = candidatesForHousehold(recipes, members);

  if (pool.length === 0) {
    throw new Error(
      "No recipes are compatible with every household member. Add recipes or relax dietary tags.",
    );
  }

  const usedIngredients = new Set<string>();
  const unbalanceable: UnbalanceableNote[] = [];

  const pickRecipe = (): Recipe => {
    // Soft tiebreaker: weight each candidate by 1 + overlap with the running
    // ingredient set, then sample. Overlap nudges selection without forcing it.
    const weights = pool.map((r) => {
      const overlap = r.ingredients.filter((ri) => usedIngredients.has(ri.ingredient_id)).length;
      return 1 + overlap;
    });
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = rng() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  const days = opts.dates.map((date) => {
    const slotRecipes = new Map<Slot, Recipe>();
    for (const slot of SLOTS) {
      const r = pickRecipe();
      slotRecipes.set(slot, r);
      for (const ri of r.ingredients) usedIngredients.add(ri.ingredient_id);
    }

    // Per-member portions for the day.
    const dayRecipeList = SLOTS.map((s) => slotRecipes.get(s)!);
    const memberPortion = new Map<string, number>();
    for (const m of members) {
      const res = balanceMemberDay(dayRecipeList, index, m);
      memberPortion.set(m.id, res.portion);
      if (!res.balanced) {
        unbalanceable.push({ date, member_id: m.id, reason: res.reason ?? "unbalanceable" });
      }
    }

    const meals: PlannedMeal[] = SLOTS.map((slot) => {
      const recipe = slotRecipes.get(slot)!;
      const portions: Record<string, number> = {};
      for (const m of members) portions[m.id] = memberPortion.get(m.id)!;
      return { slot, recipe_id: recipe.id, portions };
    });

    return { date, meals };
  });

  const plan: MealPlan = {
    id: `plan_${seed}`,
    week_of: opts.dates[0] ?? new Date().toISOString().slice(0, 10),
    status: "DRAFT",
    days,
  };

  return { plan, unbalanceable };
}

/**
 * Swap a meal: re-roll another qualifying recipe (different from current) and
 * re-balance every member's portions for that day forward. Returns a new plan.
 */
export function swapMeal(
  plan: MealPlan,
  date: string,
  slot: Slot,
  recipes: Recipe[],
  members: Member[],
  index: IngredientIndex,
  seed: number = Date.now() & 0xffffffff,
): GenerateResult {
  const pool = candidatesForHousehold(recipes, members);
  const day = plan.days.find((d) => d.date === date);
  if (!day) throw new Error(`No plan day for ${date}`);
  const meal = day.meals.find((mm) => mm.slot === slot);
  if (!meal) throw new Error(`No ${slot} meal on ${date}`);

  const alternatives = pool.filter((r) => r.id !== meal.recipe_id);
  const fromPool = alternatives.length > 0 ? alternatives : pool;
  const rng = mulberry32(seed);
  const chosen = fromPool[Math.floor(rng() * fromPool.length)];

  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const newDays = plan.days.map((d) => {
    if (d.date !== date) return d;
    const newMeals = d.meals.map((mm) => (mm.slot === slot ? { ...mm, recipe_id: chosen.id } : mm));
    const dayRecipeList = SLOTS.map((s) => recipeById.get(newMeals.find((x) => x.slot === s)!.recipe_id)!);
    const rebalanced = newMeals.map((mm) => {
      const portions: Record<string, number> = {};
      for (const m of members) portions[m.id] = balanceMemberDay(dayRecipeList, index, m).portion;
      return { ...mm, portions };
    });
    return { ...d, meals: rebalanced };
  });

  const unbalanceable: UnbalanceableNote[] = [];
  const recipeByIdAll = recipeById;
  const day2 = newDays.find((d) => d.date === date)!;
  const dayRecipeList = SLOTS.map((s) => recipeByIdAll.get(day2.meals.find((x) => x.slot === s)!.recipe_id)!);
  for (const m of members) {
    const res = balanceMemberDay(dayRecipeList, index, m);
    if (!res.balanced) unbalanceable.push({ date, member_id: m.id, reason: res.reason ?? "unbalanceable" });
  }

  return { plan: { ...plan, days: newDays }, unbalanceable };
}
