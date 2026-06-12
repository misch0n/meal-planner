// ─────────────────────────────────────────────────────────────────────────────
// Daily-needs calculator (spec §6.2). General formula, NOT medical advice.
//
// Open decisions (§10) resolved with sensible, overridable defaults:
//   - Protein default: 1.6 g/kg bodyweight.
//   - Non-protein kcal split: 50% carb / 50% fat by default (carb_fraction = 0.5).
//   - Portion bounds for the planner live in planner.ts (0.5×–2.0×).
// ─────────────────────────────────────────────────────────────────────────────
import type { MacroTargets, Member } from "../types";

export const DEFAULT_PROTEIN_G_PER_KG = 1.6;
export const DEFAULT_CARB_FRACTION = 0.5; // share of non-protein kcal going to carbs

// kcal per gram of each macronutrient.
const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const;

/** Mifflin-St Jeor BMR. */
export function bmr(m: Pick<Member, "sex" | "weight_kg" | "height_cm" | "age">): number {
  const s = m.sex === "male" ? 5 : -161;
  return 10 * m.weight_kg + 6.25 * m.height_cm - 5 * m.age + s;
}

/** Total daily energy expenditure. */
export function tdee(m: Pick<Member, "sex" | "weight_kg" | "height_cm" | "age" | "activity_level">): number {
  return bmr(m) * m.activity_level;
}

/**
 * Compute macro targets for a member. `custom_targets` bypasses the calculator
 * entirely. Otherwise: TDEE ± goal delta → protein per kg → remaining kcal split
 * carb/fat by carb_fraction.
 */
export function computeTargets(m: Member): MacroTargets {
  if (m.custom_targets) return { ...m.custom_targets };

  const base = tdee(m);
  let kcal = base;
  const delta = m.deficit_kcal ?? 0;
  if (m.goal === "deficit") kcal = base - delta;
  else if (m.goal === "surplus") kcal = base + delta;

  const proteinPerKg = m.protein_g_per_kg ?? DEFAULT_PROTEIN_G_PER_KG;
  const protein = proteinPerKg * m.weight_kg;
  const proteinKcal = protein * KCAL_PER_G.protein;

  const remaining = Math.max(0, kcal - proteinKcal);
  const carbFraction = m.carb_fraction ?? DEFAULT_CARB_FRACTION;
  const carb = (remaining * carbFraction) / KCAL_PER_G.carb;
  const fat = (remaining * (1 - carbFraction)) / KCAL_PER_G.fat;

  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carb: Math.round(carb),
    fat: Math.round(fat),
  };
}

export interface MemberDerived {
  bmr: number;
  tdee: number;
  targets: MacroTargets;
}

export function deriveMember(m: Member): MemberDerived {
  return {
    bmr: Math.round(bmr(m)),
    tdee: Math.round(tdee(m)),
    targets: computeTargets(m),
  };
}
