// ─────────────────────────────────────────────────────────────────────────────
// Generates src/data/ingredients.json.
//
//   node scripts/build-ingredients.mjs           → curated dataset (default)
//   node scripts/build-ingredients.mjs --usda    → pull the FULL nutrient panel
//                                                   live from USDA FoodData Central
//
// The --usda path needs network access to api.nal.usda.gov and a free API key:
//   FDC_API_KEY=xxxx node scripts/build-ingredients.mjs --usda
// Get a key at https://fdc.nal.usda.gov/api-key-signup.html . It maps each
// curated food's `source_ref` (FDC id) to the live record and overwrites
// per_100g with every nutrient FDC reports, keeping our conversion data.
// ─────────────────────────────────────────────────────────────────────────────
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CURATED_FOODS } from "./curated-foods.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/ingredients.json");

// FDC nutrient id → our canonical key (see src/lib/nutrients.ts).
const FDC_MAP = {
  208: "kcal",
  203: "protein",
  205: "carb",
  204: "fat",
  291: "fiber",
  269: "sugar",
  606: "sat_fat",
  645: "mono_fat",
  646: "poly_fat",
  605: "trans_fat",
  601: "cholesterol",
  307: "sodium",
  306: "potassium",
  301: "calcium",
  303: "iron",
  304: "magnesium",
  305: "phosphorus",
  309: "zinc",
  312: "copper",
  315: "manganese",
  317: "selenium",
  320: "vit_a_rae",
  401: "vit_c",
  328: "vit_d",
  323: "vit_e",
  430: "vit_k",
  404: "thiamin",
  405: "riboflavin",
  406: "niacin",
  415: "vit_b6",
  417: "folate",
  418: "vit_b12",
};

function clean(food) {
  // Drop any per_100g keys that ended up undefined/null.
  const per = {};
  for (const [k, v] of Object.entries(food.per_100g)) {
    if (typeof v === "number" && Number.isFinite(v)) per[k] = round(v);
  }
  return { ...food, per_100g: per };
}

const round = (n) => Math.round(n * 1000) / 1000;

async function fetchUsda(foods) {
  const key = process.env.FDC_API_KEY;
  if (!key) throw new Error("Set FDC_API_KEY to use --usda mode.");
  const out = [];
  for (const food of foods) {
    const fdcId = (food.source_ref || "").replace(/^SR-?/i, "").trim();
    if (!fdcId || !/^\d+$/.test(fdcId)) {
      out.push(food); // no mappable FDC id — keep curated values
      continue;
    }
    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${key}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const per = {};
      for (const fn of data.foodNutrients || []) {
        const num = Number(fn.nutrient?.number ?? fn.number);
        const key2 = FDC_MAP[num];
        const amount = fn.amount ?? fn.nutrient?.amount;
        if (key2 && typeof amount === "number") per[key2] = round(amount);
      }
      if (per.kcal && per.protein != null) {
        out.push({ ...food, source: "usda", per_100g: per });
        console.log(`✓ ${food.name} (fdc:${fdcId})`);
      } else {
        out.push(food);
        console.warn(`! ${food.name} — sparse FDC record, kept curated`);
      }
    } catch (err) {
      out.push(food);
      console.warn(`! ${food.name} — ${err.message}, kept curated`);
    }
    await new Promise((r) => setTimeout(r, 120)); // be polite to the API
  }
  return out;
}

async function main() {
  const useUsda = process.argv.includes("--usda");
  let foods = CURATED_FOODS;
  if (useUsda) {
    console.log(`Fetching ${foods.length} foods from USDA FoodData Central…`);
    foods = await fetchUsda(foods);
  }
  const cleaned = foods.map(clean);
  await writeFile(OUT, JSON.stringify(cleaned, null, 2) + "\n");
  const micros = new Set();
  for (const f of cleaned) for (const k of Object.keys(f.per_100g)) micros.add(k);
  console.log(`Wrote ${cleaned.length} ingredients → ${OUT}`);
  console.log(`Distinct nutrients present: ${micros.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
