import { describe, expect, it } from "vitest";
import { indexIngredients, analyzeRecipe, scaleProfile } from "./nutrition";
import { bmr, tdee, computeTargets } from "./needs";
import { toGrams } from "./conversion";
import { balanceMemberDay, generatePlan, MIN_PORTION, MAX_PORTION } from "./planner";
import { buildShoppingList } from "./shopping";
import { deficitSeries, dateRange, rollup } from "./analytics";
import { VOLUME_MEASURES } from "./measures";
import type { Ingredient, MealPlan, Member, Recipe } from "../types";

const chicken: Ingredient = {
  id: "chicken",
  name: "Chicken",
  category: "meat",
  source: "manual",
  per_100g: { kcal: 120, protein: 22.5, carb: 0, fat: 2.6 },
  piece_weights: { fillet: 170 },
};
const oil: Ingredient = {
  id: "oil",
  name: "Olive oil",
  category: "fat",
  source: "manual",
  per_100g: { kcal: 900, protein: 0, carb: 0, fat: 100 },
  density_g_per_ml: 0.91,
};
const rice: Ingredient = {
  id: "rice",
  name: "Rice",
  category: "grain",
  source: "manual",
  per_100g: { kcal: 350, protein: 7, carb: 78, fat: 1 },
};

const ingredients = [chicken, oil, rice];
const index = indexIngredients(ingredients);

const recipe: Recipe = {
  id: "r1",
  name: "Chicken & rice",
  tags: ["high-protein"],
  steps: [],
  servings_base: 1,
  ingredients: [
    { ingredient_id: "chicken", grams: 200 },
    { ingredient_id: "rice", grams: 100 },
    { ingredient_id: "oil", grams: 10 },
  ],
};

describe("conversion engine", () => {
  it("converts ml → grams via density", () => {
    expect(toGrams(100, "ml", oil)).toBeCloseTo(91);
  });
  it("converts pieces → grams via piece weights", () => {
    expect(toGrams(2, "piece", chicken, "fillet")).toBe(340);
  });
  it("returns grams unchanged for g", () => {
    expect(toGrams(55, "g", rice)).toBe(55);
  });
  it("returns null when density is missing", () => {
    expect(toGrams(100, "ml", rice)).toBeNull();
  });
  it("converts standard volume measures to grams via density", () => {
    const tbsp = VOLUME_MEASURES.find((m) => m.label.startsWith("1 tablespoon"))!;
    // 1 US tbsp (14.7868 ml) of olive oil (0.91 g/ml) ≈ 13.46 g
    expect(tbsp.ml * oil.density_g_per_ml!).toBeCloseTo(13.46, 1);
    const cup = VOLUME_MEASURES.find((m) => m.label.startsWith("1 cup"))!;
    // 1 US cup of water (1 g/ml) ≈ 236.6 g
    expect(cup.ml * 1.0).toBeCloseTo(236.6, 1);
  });
});

describe("nutrition analytics", () => {
  it("scales per-100g correctly", () => {
    expect(scaleProfile(chicken.per_100g, 200).kcal).toBe(240);
  });
  it("aggregates a recipe deterministically", () => {
    const { profile } = analyzeRecipe(recipe, index);
    // chicken 200g: 240 kcal; rice 100g: 350; oil 10g: 90 → 680
    expect(profile.kcal).toBeCloseTo(240 + 350 + 90);
    expect(profile.protein).toBeCloseTo(45 + 7 + 0);
  });
  it("reports missing ingredients", () => {
    const r: Recipe = { ...recipe, ingredients: [{ ingredient_id: "ghost", grams: 50 }] };
    expect(analyzeRecipe(r, index).missing).toEqual(["ghost"]);
  });
});

describe("daily-needs calculator", () => {
  const m: Member = {
    id: "m",
    name: "M",
    sex: "male",
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    activity_level: 1.55,
    goal: "maintain",
  };
  it("computes Mifflin-St Jeor BMR", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr(m)).toBeCloseTo(1780);
  });
  it("applies activity to TDEE", () => {
    expect(tdee(m)).toBeCloseTo(1780 * 1.55);
  });
  it("applies deficit and protein-per-kg default", () => {
    const t = computeTargets({ ...m, goal: "deficit", deficit_kcal: 500 });
    expect(t.kcal).toBe(Math.round(1780 * 1.55 - 500));
    expect(t.protein).toBe(Math.round(1.6 * 80));
  });
  it("custom targets bypass the calculator", () => {
    const t = computeTargets({ ...m, custom_targets: { kcal: 2000, protein: 150, carb: 200, fat: 60 } });
    expect(t).toEqual({ kcal: 2000, protein: 150, carb: 200, fat: 60 });
  });
});

describe("planner balancing", () => {
  const member: Member = {
    id: "m",
    name: "M",
    sex: "male",
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    activity_level: 1.55,
    goal: "maintain",
    custom_targets: { kcal: 2040, protein: 150, carb: 200, fat: 60 },
  };
  it("lands uniform portion exactly on kcal target when in bounds", () => {
    // one recipe of 680 kcal × 3 meals = 2040 base; target 2040 → portion 1.0
    const res = balanceMemberDay([recipe, recipe, recipe], index, member);
    expect(res.balanced).toBe(true);
    expect(res.portion).toBeCloseTo(1.0);
  });
  it("flags unbalanceable when target needs > MAX_PORTION", () => {
    const huge: Member = { ...member, custom_targets: { kcal: 9000, protein: 150, carb: 200, fat: 60 } };
    const res = balanceMemberDay([recipe, recipe, recipe], index, huge);
    expect(res.balanced).toBe(false);
    expect(res.portion).toBe(MAX_PORTION);
  });
  it("flags unbalanceable when target needs < MIN_PORTION", () => {
    const tiny: Member = { ...member, custom_targets: { kcal: 500, protein: 150, carb: 200, fat: 60 } };
    const res = balanceMemberDay([recipe, recipe, recipe], index, tiny);
    expect(res.balanced).toBe(false);
    expect(res.portion).toBe(MIN_PORTION);
  });
});

describe("plan generation + shopping list", () => {
  const recipes: Recipe[] = [recipe, { ...recipe, id: "r2", name: "Variant" }];
  const member: Member = {
    id: "m",
    name: "M",
    sex: "male",
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    activity_level: 1.55,
    goal: "maintain",
  };
  it("is deterministic given a seed", () => {
    const a = generatePlan(recipes, [member], index, { dates: ["2026-01-01", "2026-01-02"], seed: 42 });
    const b = generatePlan(recipes, [member], index, { dates: ["2026-01-01", "2026-01-02"], seed: 42 });
    expect(JSON.stringify(a.plan.days)).toBe(JSON.stringify(b.plan.days));
  });
  it("aggregates shopping grams across portions", () => {
    const plan: MealPlan = {
      id: "p",
      week_of: "2026-01-01",
      status: "DRAFT",
      days: [
        {
          date: "2026-01-01",
          meals: [{ slot: "noon", recipe_id: "r1", portions: { m: 2 } }],
        },
      ],
    };
    const { groups } = buildShoppingList(plan, recipes, index);
    const meat = groups.find((g) => g.category === "meat")!;
    // chicken 200g × portion 2 = 400g
    expect(meat.lines[0].grams).toBe(400);
  });
});

describe("analytics deficit", () => {
  const member: Member = {
    id: "m",
    name: "M",
    sex: "male",
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    activity_level: 1.55,
    goal: "maintain",
    custom_targets: { kcal: 2000, protein: 150, carb: 200, fat: 60 },
  };
  it("computes cumulative deficit over a range", () => {
    const logs = [
      { id: "1", date: "2026-01-01", slot: "noon" as const, member_id: "m", kind: "adhoc" as const, macros: { kcal: 1500 } },
      { id: "2", date: "2026-01-02", slot: "noon" as const, member_id: "m", kind: "adhoc" as const, macros: { kcal: 1800 } },
    ];
    const series = deficitSeries(logs, member, dateRange("2026-01-01", "2026-01-02"));
    expect(series[0].dailyDeficit).toBe(500); // 2000 - 1500
    expect(series[1].cumulativeDeficit).toBe(700); // 500 + (2000-1800)
  });
  it("rollup sums macros over filter", () => {
    const logs = [
      { id: "1", date: "2026-01-01", slot: "morning" as const, member_id: "m", kind: "adhoc" as const, macros: { kcal: 300, protein: 20 } },
      { id: "2", date: "2026-01-01", slot: "noon" as const, member_id: "m", kind: "adhoc" as const, macros: { kcal: 700, protein: 40 } },
    ];
    expect(rollup(logs, { slots: ["morning"] }).kcal).toBe(300);
    expect(rollup(logs).protein).toBe(60);
  });
});
