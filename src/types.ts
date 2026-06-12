// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for the Meal Planner & Nutrition Engine.
//
// Principle #1: grams are the only internal unit. Every weight stored anywhere
// in this app is grams. Volume and piece inputs are conveniences that convert to
// grams at entry time (see lib/conversion.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type Slot = "morning" | "noon" | "evening";
export const SLOTS: Slot[] = ["morning", "noon", "evening"];

export type IngredientSource = "ciqual" | "usda" | "manual";

/** A macro/micro profile. Macros are always present; micros are optional extras. */
export interface NutrientProfile {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber?: number;
  // CIQUAL ships 60+ micros; any extra nutrient lives here keyed by name.
  [nutrient: string]: number | undefined;
}

/** Base product — the trusted, single-component unit of truth. Per-100 g. */
export interface Ingredient {
  id: string;
  name: string;
  name_local?: string;
  category: string; // vegetable | meat | dairy | fat | grain | fruit | legume | ...
  source: IngredientSource;
  source_ref?: string;

  per_100g: NutrientProfile;

  // Conversion data — sourced separately from CIQUAL/USDA. Both optional.
  density_g_per_ml?: number;
  piece_weights?: Record<string, number>; // { clove: 5, medium: 110, large: 150 }
}

export interface RecipeIngredient {
  ingredient_id: string;
  grams: number;
}

export interface Recipe {
  id: string;
  name: string;
  tags: string[];
  steps: string[];
  servings_base: 1; // always per-1-person
  ingredients: RecipeIngredient[];
}

export type Sex = "male" | "female";
export type Goal = "deficit" | "maintain" | "surplus";

export interface MacroTargets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Member {
  id: string;
  name: string;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: number; // 1.2 sedentary … 1.9 very active
  goal: Goal;
  deficit_kcal?: number; // explicit delta when goal = deficit/surplus
  protein_g_per_kg?: number; // override protein target
  carb_fraction?: number; // override carb share of non-protein kcal (0..1)
  custom_targets?: MacroTargets; // bypass the calculator entirely
  dietary_tags?: string[]; // recipes must be compatible with these (e.g. vegetarian)
}

export interface Household {
  members: Member[];
}

export interface PlannedMeal {
  slot: Slot;
  recipe_id: string;
  /** per-member portion multiplier; absent member = not eating this meal */
  portions: Record<string, number>;
}

export interface PlanDay {
  date: string; // ISO yyyy-mm-dd
  meals: PlannedMeal[];
}

export type PlanStatus = "DRAFT" | "APPROVED" | "CART_READY" | "ORDERED";

export interface MealPlan {
  id: string;
  week_of: string; // ISO date of the Monday (or chosen anchor)
  status: PlanStatus;
  days: PlanDay[];
}

export type LogKind = "planned" | "adhoc" | "treat";

export interface LogEntry {
  id: string;
  date: string;
  slot: Slot;
  member_id: string;
  kind: LogKind;
  ref?: string; // ingredient_id | recipe_id
  grams?: number;
  macros: { kcal: number; protein?: number; carb?: number; fat?: number };
  note?: string;
}

export interface WeightEntry {
  id: string;
  member_id: string;
  date: string;
  weight_kg: number;
}

/** The entire database — this is what gets persisted to localStorage and
 *  exported/imported as a single JSON blob. */
export interface Database {
  version: number;
  ingredients: Ingredient[];
  recipes: Recipe[];
  household: Household;
  plans: MealPlan[];
  logs: LogEntry[];
  weights: WeightEntry[];
}
