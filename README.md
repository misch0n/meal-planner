# Meal Planner & Nutrition Engine

A static, offline-capable React SPA for household meal planning and nutrition
tracking. **Grams are the only internal unit**; all nutrition math is
deterministic arithmetic (no LLM in the numeric path); the whole database lives
in your browser's local storage with JSON export/import as the backup path.

> Implements the v0.1 design spec. Deploys to GitHub Pages with zero backend,
> no auth, no server.

## Features (build steps 1–5 + optional weight tracker)

| Subsystem | What it does |
|---|---|
| **Ingredients** | Curated CIQUAL/USDA-style base products + manual entry. Per-100 g nutrition, optional density & piece-weight conversion data. |
| **Converter** | Standalone tool: standard kitchen volume measures (tsp, tbsp, fl oz, ¼/⅓/½/¾ cup, pint, metric cup…) → grams via density, plus a per-measure reference table and piece → mass. Solids/powders flagged approximate. |
| **Recipes** | Composer with grams/volume/piece entry (converts to grams on save) + live macro analytics. Doubles as a standalone analyzer. |
| **Household** | Per-member profiles; Mifflin–St Jeor BMR/TDEE and macro targets; `custom_targets` bypass. |
| **Planner** | Per-member constrained-random plan; portion scaling to hit targets within 0.5×–2.0× or flag the day unbalanceable. Swaps re-roll + re-balance. Status machine DRAFT → APPROVED → CART_READY → ORDERED. |
| **Shopping List** | Aggregates grams per base ingredient across the whole plan and all member portions; plain-text export. |
| **Logger** | "Ate X g of a known thing" (looked-up, scaled) or freeform treats. The plan logs itself. |
| **Analytics** | Roll up logged macros vs. targets over a range, slot filters, per-member & household views, cumulative deficit. |
| **Weight** | Optional body-weight overlay with an inline trend chart. |
| **Data & Backup** | JSON export/import/reset + data-source attribution. |

## Design decisions (spec §10)

- **Protein default:** 1.6 g/kg bodyweight (overridable per member).
- **Macro split:** non-protein kcal split 50% carb / 50% fat (`carb_fraction`, overridable).
- **Portion bounds:** 0.5×–2.0×; outside → day surfaced as unbalanceable.
- **Slots:** fixed at three — morning / noon / evening.
- **Recipe steps:** plain strings.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # deterministic engine unit tests (vitest)
npm run build    # typecheck + production build
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with the
`/meal-planner/` base path and publishes `dist/` to GitHub Pages. Enable Pages
in repo **Settings → Pages → Source: GitHub Actions** once.

## Architecture

```
src/
├── types.ts                 # the whole domain model
├── data/                    # bundled ingredients.json + seed recipes/household
├── lib/                     # deterministic engine (pure, unit-tested)
│   ├── conversion.ts        # volume/piece → grams
│   ├── nutrition.ts         # recipe analytics & scaling
│   ├── needs.ts             # BMR / TDEE / macro targets
│   ├── planner.ts           # constrained-random selection + portion balancing
│   ├── shopping.ts          # weekly aggregation
│   ├── analytics.ts         # rollups & deficit
│   └── storage.ts           # localStorage + JSON export/import
├── store/DB.tsx             # React context over the database
└── components/pages/        # one screen per subsystem
```

The `lib/` engine has no React or DOM dependencies and is covered by
`src/lib/engine.test.ts`.

## Ingredient dataset

`src/data/ingredients.json` ships **~180 base foods across every category**
(vegetables, fruits, dairy & eggs, meat, fish, legumes, grains, nuts & seeds,
fats, fresh herbs, spices, sweeteners, condiments, beverages) plus a **treats
reference section** (chips, chocolate, soda… approximate by design). Each food
carries a full nutrient panel — macros plus up to ~27 micronutrients
(minerals + vitamins) — with any unknown value simply omitted.

The data is **generated**, not hand-maintained as JSON. The editable source is
`scripts/curated-foods.mjs` (canonical USDA FoodData Central per-100 g values):

```bash
node scripts/build-ingredients.mjs          # regenerate from curated values
FDC_API_KEY=xxxx node scripts/build-ingredients.mjs --usda   # pull live full panel
```

The `--usda` mode maps each food's `source_ref` (FDC id) to the live FoodData
Central record and overwrites `per_100g` with every nutrient USDA reports
(requires a free key from https://fdc.nal.usda.gov/api-key-signup.html and
network access to `api.nal.usda.gov`). Nutrient keys/units are defined once in
`src/lib/nutrients.ts` so the curated data, the fetcher, and the UI all agree.

## Data sources & attribution

Nutrition values are canonical figures from the public-domain **USDA FoodData
Central** (SR Legacy / Foundation Foods), with **Anses. Ciqual** as a secondary
reference. Density and piece-weight conversion data are sourced separately from
standard food references. Treat values are approximate references, not
lab-precise.

Daily-needs calculations use the Mifflin–St Jeor equation — a general estimate
for able-bodied adults, **not medical advice**.

## Out of scope for v1

ebag grocery MCP integration, conversational agent layer, multi-day meal-prep
view, and full micronutrient UI — the schema already supports micros, so they
layer in with no migration.
