// ─────────────────────────────────────────────────────────────────────────────
// Seed database. The bundled CIQUAL/USDA-derived base ingredients ship in
// ingredients.json; a handful of starter recipes and one example household
// member make the app immediately explorable. Everything here is editable and
// fully replaceable via JSON import.
// ─────────────────────────────────────────────────────────────────────────────
import type { Database, Ingredient, Member, Recipe } from "../types";
import rawIngredients from "./ingredients.json";

export const DB_VERSION = 1;

export const seedIngredients = rawIngredients as Ingredient[];

export const seedRecipes: Recipe[] = [
  {
    id: "rec_oatmeal_pb_banana",
    name: "Oatmeal with peanut butter & banana",
    tags: ["vegetarian", "quick", "breakfast"],
    steps: [
      "Bring 250 ml milk to a simmer.",
      "Stir in oats and cook 4–5 min until creamy.",
      "Top with sliced banana and a spoon of peanut butter.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_oats", grams: 60 },
      { ingredient_id: "ing_milk_whole", grams: 250 },
      { ingredient_id: "ing_banana", grams: 120 },
      { ingredient_id: "ing_peanut_butter", grams: 16 },
    ],
  },
  {
    id: "rec_greek_yogurt_bowl",
    name: "Greek yogurt, blueberries & almonds",
    tags: ["vegetarian", "high-protein", "quick", "breakfast"],
    steps: ["Spoon yogurt into a bowl.", "Top with blueberries, almonds and honey."],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_greek_yogurt", grams: 200 },
      { ingredient_id: "ing_blueberries", grams: 80 },
      { ingredient_id: "ing_almonds", grams: 20 },
      { ingredient_id: "ing_honey", grams: 14 },
    ],
  },
  {
    id: "rec_chicken_rice_broccoli",
    name: "Chicken, rice & broccoli",
    tags: ["high-protein", "lunch", "dinner"],
    steps: [
      "Cook rice.",
      "Pan-sear seasoned chicken in olive oil until cooked through.",
      "Steam broccoli; plate everything together.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_chicken_breast", grams: 170 },
      { ingredient_id: "ing_rice_white", grams: 80 },
      { ingredient_id: "ing_broccoli", grams: 150 },
      { ingredient_id: "ing_olive_oil", grams: 10 },
    ],
  },
  {
    id: "rec_beef_pasta",
    name: "Beef bolognese pasta",
    tags: ["high-protein", "lunch", "dinner"],
    steps: [
      "Soften onion and garlic in olive oil.",
      "Brown the beef mince; add chopped tomato and simmer 20 min.",
      "Boil pasta; combine and top with parmigiano.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_beef_mince", grams: 130 },
      { ingredient_id: "ing_pasta_dry", grams: 90 },
      { ingredient_id: "ing_tomato", grams: 150 },
      { ingredient_id: "ing_onion", grams: 50 },
      { ingredient_id: "ing_garlic", grams: 5 },
      { ingredient_id: "ing_olive_oil", grams: 8 },
      { ingredient_id: "ing_parmigiano", grams: 15 },
    ],
  },
  {
    id: "rec_salmon_potato",
    name: "Baked salmon with potatoes & spinach",
    tags: ["high-protein", "dinner"],
    steps: [
      "Roast potatoes in olive oil at 200°C for 30 min.",
      "Add salmon for the last 12 min.",
      "Wilt spinach and serve.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_salmon", grams: 160 },
      { ingredient_id: "ing_potato", grams: 200 },
      { ingredient_id: "ing_spinach", grams: 80 },
      { ingredient_id: "ing_olive_oil", grams: 10 },
    ],
  },
  {
    id: "rec_shopska_salad",
    name: "Shopska salad with sirene",
    tags: ["vegetarian", "quick", "lunch"],
    steps: [
      "Dice tomato, cucumber and pepper.",
      "Dress with sunflower oil; top generously with grated sirene.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_tomato", grams: 150 },
      { ingredient_id: "ing_cucumber", grams: 120 },
      { ingredient_id: "ing_bell_pepper", grams: 60 },
      { ingredient_id: "ing_onion", grams: 30 },
      { ingredient_id: "ing_sirene", grams: 60 },
      { ingredient_id: "ing_sunflower_oil", grams: 10 },
    ],
  },
  {
    id: "rec_chickpea_bowl",
    name: "Chickpea & tofu veg bowl",
    tags: ["vegetarian", "vegan", "high-protein", "lunch", "dinner"],
    steps: [
      "Roast tofu and pepper in olive oil.",
      "Warm chickpeas; combine over rice with carrot and spinach.",
    ],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_chickpeas_cooked", grams: 150 },
      { ingredient_id: "ing_tofu", grams: 120 },
      { ingredient_id: "ing_rice_white", grams: 70 },
      { ingredient_id: "ing_carrot", grams: 70 },
      { ingredient_id: "ing_spinach", grams: 60 },
      { ingredient_id: "ing_olive_oil", grams: 10 },
    ],
  },
  {
    id: "rec_egg_toast",
    name: "Eggs on toast",
    tags: ["vegetarian", "quick", "high-protein", "breakfast"],
    steps: ["Fry or scramble the eggs in butter.", "Serve on toasted bread."],
    servings_base: 1,
    ingredients: [
      { ingredient_id: "ing_egg", grams: 116 },
      { ingredient_id: "ing_bread_white", grams: 60 },
      { ingredient_id: "ing_butter", grams: 8 },
    ],
  },
];

export const seedMember: Member = {
  id: "mem_example",
  name: "Example Member",
  sex: "male",
  age: 32,
  height_cm: 180,
  weight_kg: 80,
  activity_level: 1.55,
  goal: "deficit",
  deficit_kcal: 400,
  protein_g_per_kg: 1.8,
  dietary_tags: [],
};

export function seedDatabase(): Database {
  return {
    version: DB_VERSION,
    ingredients: seedIngredients,
    recipes: seedRecipes,
    household: { members: [seedMember] },
    plans: [],
    logs: [],
    weights: [],
  };
}
